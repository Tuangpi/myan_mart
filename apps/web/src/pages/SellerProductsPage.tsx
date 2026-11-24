import { useEffect, useState, type FormEvent } from 'react';
import {
  useI18n,
  type CategoryResponse,
  type Paginated,
  type ProductStatus,
} from '@myanmart/shared';
import { I18nLayout } from '../layouts/I18nLayout';
import { ApiRequestError, apiRequest, jsonRequest } from '../lib/api-client';
import { AccountPageHeader } from '../components/account-page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

function statusVariant(status: string) {
  if (status === 'ACTIVE' || status === 'APPROVED') return 'success' as const;
  if (status === 'ARCHIVED' || status === 'REJECTED' || status === 'SUSPENDED')
    return 'destructive' as const;
  if (status === 'PENDING') return 'warning' as const;
  return 'secondary' as const;
}

interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  status: ProductStatus;
  categoryId: string | null;
  images: { id: string; imageUrl: string }[];
}
const empty = { name: '', slug: '', description: '', price: '', stock: '0', categoryId: '' };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(url, init);
  } catch (error) {
    if (error instanceof ApiRequestError) throw new Error(String(error.status));
    throw error;
  }
}

function SellerProductsContent() {
  const { t } = useI18n();
  const text = (key: string) => t(`sellerProducts.${key}`);
  const [items, setItems] = useState<SellerProduct[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      api<Paginated<SellerProduct>>(`/api/seller/products?page=${page}&pageSize=12`),
      api<CategoryResponse[]>('/api/categories'),
      api<{ status: string }[]>('/api/seller/store'),
    ])
      .then(([products, cats, stores]) => {
        if (cancelled) return;
        setItems(products.items);
        setPages(products.totalPages);
        setCategories(cats);
        setStatus(stores[0]?.status ?? '');
      })
      .catch((err: Error) => {
        if (!cancelled)
          setError(
            err.message === '401' ? 'signIn' : err.message === '403' ? 'forbidden' : 'failed',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, revision]);

  function reset() {
    setEditing(null);
    setForm(empty);
    setFile(null);
    setFileKey((n) => n + 1);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
      setRevision((n) => n + 1);
    } catch {
      setError('saveFailed');
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const product = await api<SellerProduct>(
        editing ? `/api/seller/products/${editing}` : '/api/seller/products',
        {
          method: editing ? 'PATCH' : 'POST',
          ...jsonRequest({
            ...form,
            slug: form.slug || undefined,
            price: Number(form.price),
            stock: Number(form.stock),
            categoryId: form.categoryId || null,
          }),
        },
      );
      // Retain the saved ID if upload fails, so retry cannot create a duplicate product.
      setEditing(product.id);
      if (file) {
        const data = new FormData();
        data.append('image', file);
        await api(`/api/seller/products/${product.id}/images`, { method: 'POST', body: data });
      }
      reset();
    });
  }
  const changeStatus = (product: SellerProduct, next: ProductStatus) =>
    void run(async () => {
      await api(`/api/seller/products/${product.id}`, {
        method: 'PATCH',
        ...jsonRequest({ status: next }),
      });
    });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AccountPageHeader
        eyebrow={t('sellerProducts.title')}
        title={text('title')}
        description={t('app.tagline')}
      />
      {error && <Alert variant="destructive">{text(error)}</Alert>}
      {loading ? (
        <div role="status" className="grid gap-4 md:grid-cols-2">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : (
        <>
          <Alert
            variant={status === 'APPROVED' ? 'success' : 'default'}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <span>
              {text('storeStatus')}: <strong>{text(status || 'noStore')}</strong>
            </span>
            {status !== 'APPROVED' && <span>{text('approvalRequired')}</span>}
          </Alert>
          <form onSubmit={save} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5">
              <h3 className="text-lg font-bold">{text(editing ? 'edit' : 'create')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text('image')}</p>
            </div>
            <fieldset disabled={busy || !status} className="grid gap-4 sm:grid-cols-2">
              {(['name', 'slug', 'price', 'stock'] as const).map((key) => (
                <label key={key} className="grid gap-1">
                  {text(key)}
                  <Input
                    value={form[key]}
                    required={key !== 'slug'}
                    type={key === 'price' || key === 'stock' ? 'number' : 'text'}
                    min={key === 'price' ? 1 : 0}
                    max={key === 'price' || key === 'stock' ? 2147483647 : undefined}
                    minLength={key === 'name' ? 2 : undefined}
                    maxLength={key === 'name' ? 200 : key === 'slug' ? 60 : undefined}
                    pattern={key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
              <label className="grid gap-1">
                {text('description')}
                <Textarea
                  maxLength={5000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label className="grid gap-1">
                {text('category')}
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">{text('noCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                {text('image')}
                <Input
                  key={fileKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit">{text('save')}</Button>
                <Button type="button" variant="ghost" onClick={reset}>
                  {text('cancel')}
                </Button>
              </div>
            </fieldset>
          </form>
          {!items.length && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {text('empty')}
              </CardContent>
            </Card>
          )}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <li key={product.id}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle>{product.name}</CardTitle>
                      <Badge variant={statusVariant(product.status)}>{text(product.status)}</Badge>
                    </div>
                    <CardDescription>
                      {product.price.toLocaleString()} MMK · {text('stock')}: {product.stock}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {text('imageCount')}: {product.images.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setEditing(product.id);
                          setForm({
                            name: product.name,
                            slug: product.slug,
                            description: product.description ?? '',
                            price: String(product.price),
                            stock: String(product.stock),
                            categoryId: product.categoryId ?? '',
                          });
                          setFile(null);
                          setFileKey((n) => n + 1);
                        }}
                      >
                        {text('edit')}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy || status !== 'APPROVED' || product.status === 'ACTIVE'}
                        onClick={() => changeStatus(product, 'ACTIVE')}
                      >
                        {text('publish')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy || product.status === 'ARCHIVED'}
                        onClick={() => changeStatus(product, 'ARCHIVED')}
                      >
                        {text('archive')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <nav aria-label={text('pagination')} className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              disabled={busy || page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {text('previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {Math.max(1, pages)}
            </span>
            <Button
              variant="outline"
              disabled={busy || page >= pages}
              onClick={() => setPage(page + 1)}
            >
              {text('next')}
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}

export function SellerProductsPage() {
  return (
    <I18nLayout>
      <SellerProductsContent />
    </I18nLayout>
  );
}
