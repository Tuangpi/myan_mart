import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import {
  useI18n,
  type CategoryResponse,
  type Paginated,
  type ProductSummary,
} from '@myanmart/shared';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { I18nLayout } from '../layouts/I18nLayout';
import { apiRequest } from '../lib/api-client';

const PAGE_SIZE = 12;
type SortField = 'name' | 'price' | 'createdAt';
const SORT_OPTIONS: { value: SortField; labelKey: string }[] = [
  { value: 'createdAt', labelKey: 'catalogPage.sortNewest' },
  { value: 'name', labelKey: 'catalogPage.sortName' },
  { value: 'price', labelKey: 'catalogPage.sortPrice' },
];

function CatalogContent() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== debouncedSearch) {
        setDebouncedSearch(search.trim());
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<CategoryResponse[]>('/api/categories')
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortBy,
      sortOrder,
    });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryId) params.set('categoryId', categoryId);
    apiRequest<Paginated<ProductSummary>>(`/api/products?${params}`)
      .then((data) => {
        if (cancelled) return;
        setProducts(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setProducts([]);
          setTotalPages(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, categoryId, sortBy, sortOrder]);

  const showingText = useMemo(() => {
    if (loading) return t('common.loading');
    if (error) return t('notifications.loadFailed');
    if (products.length === 0) return t('catalog.noResults');
    return t('catalogPage.showing', { count: products.length, total });
  }, [error, loading, products.length, t, total]);
  const filtersActive = Boolean(
    search || categoryId || sortBy !== 'createdAt' || sortOrder !== 'desc',
  );
  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryId('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-linear-to-br from-primary to-primary/80 px-5 py-8 text-primary-foreground shadow-sm sm:px-8 sm:py-10">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
          {t('app.name')}
        </p>
        <h1 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
          {t('commerce.catalogHeading')}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/85 sm:text-base">
          {t('app.tagline')}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('catalogPage.searchPlaceholder')}
              className="pl-10"
              aria-label={t('catalogPage.searchPlaceholder')}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <label className="relative min-w-0 sm:w-52">
              <span className="sr-only">{t('catalogPage.filterCategory')}</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
                aria-label={t('catalogPage.filterCategory')}
              >
                <option value="">{t('catalogPage.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.productCount})
                  </option>
                ))}
              </Select>
            </label>
            <label className="relative min-w-0 sm:w-44">
              <span className="sr-only">{t('catalogPage.sortBy')}</span>
              <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SortField);
                  setPage(1);
                }}
                className="pl-9"
                aria-label={t('catalogPage.sortBy')}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSortOrder((value) => (value === 'asc' ? 'desc' : 'asc'));
              setPage(1);
            }}
            aria-label={t('catalogPage.sortOrder')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
            <span className="hidden sm:inline">{t('catalogPage.sortOrder')}</span>
          </Button>
        </div>
        {categories.length > 0 && (
          <div
            className="mt-4 flex gap-2 overflow-x-auto pb-1"
            aria-label={t('catalogPage.filterCategory')}
          >
            <Button
              type="button"
              size="sm"
              variant={categoryId ? 'outline' : 'secondary'}
              onClick={() => {
                setCategoryId('');
                setPage(1);
              }}
            >
              {t('catalogPage.allCategories')}
            </Button>
            {categories.map((category) => (
              <Button
                type="button"
                key={category.id}
                size="sm"
                variant={categoryId === category.id ? 'secondary' : 'outline'}
                className="shrink-0"
                onClick={() => {
                  setCategoryId(category.id);
                  setPage(1);
                }}
              >
                {category.name}
              </Button>
            ))}
          </div>
        )}
        {filtersActive && (
          <div className="mt-4">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-4" />
              {t('catalog.reset')}
            </Button>
          </div>
        )}
      </section>

      <div>
        <h2 className="text-xl font-black">{t('catalog.title')}</h2>
        <p role={error ? 'alert' : 'status'} className="mt-1 text-sm text-muted-foreground">
          {showingText}
        </p>
      </div>
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-border bg-card p-4"
            >
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="mt-4 h-3 w-20" />
              <Skeleton className="mt-3 h-5 w-4/5" />
              <Skeleton className="mt-3 h-6 w-2/5" />
              <Skeleton className="mt-5 h-9 w-full" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <Search className="mx-auto size-9 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">{t('commerce.emptyCatalogHint')}</h2>
          {filtersActive && (
            <Button type="button" className="mt-5" variant="outline" onClick={resetFilters}>
              {t('catalog.reset')}
            </Button>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-3 pt-2"
          aria-label={t('pagination.goToPage')}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={loading || page <= 1}
          >
            {t('pagination.previous')}
          </Button>
          <span className="text-sm font-semibold text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={loading || page >= totalPages}
          >
            {t('pagination.next')}
          </Button>
        </nav>
      )}
    </div>
  );
}

export function CatalogPage() {
  return (
    <I18nLayout>
      <CatalogContent />
    </I18nLayout>
  );
}
