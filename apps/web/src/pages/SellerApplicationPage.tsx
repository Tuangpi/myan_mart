import { useEffect, useState, type FormEvent } from 'react';
import { useI18n, type StoreStatus } from '@myanmart/shared';
import { I18nLayout } from '../layouts/I18nLayout';
import { useAuth } from '../contexts/auth-context';
import { ApiRequestError, apiRequest, jsonRequest } from '../lib/api-client';
import { AccountPageHeader } from '../components/account-page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';

type Store = { id: string; name: string; slug: string; description: string | null; logoUrl: string | null; status: StoreStatus };

function statusVariant(status: StoreStatus) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'PENDING') return 'default' as const;
  return 'destructive' as const;
}

function SellerApplicationContent() {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setStores(await apiRequest<Store[]>('/api/seller/store'));
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError && requestError.status === 401 ? 'errors.unauthorized' : 'sellerApplication.loadFailed');
      setStores([]);
    }
  };

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest<Store>('/api/seller/apply', {
        method: 'POST',
        ...jsonRequest({ name, slug: slug || undefined, description: description || null, logoUrl: logoUrl || null }),
      });
      await refresh();
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError && requestError.status === 409 ? 'sellerApplication.exists' : 'sellerApplication.failed');
    } finally {
      setBusy(false);
    }
  }

  const store = stores?.[0];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AccountPageHeader eyebrow={t('seller.title')} title={t('sellerApplication.title')} description={t('sellerApplication.description')} />
      {error && <Alert variant="destructive">{t(error)}</Alert>}
      {stores === null ? <p className="text-muted-foreground">{t('common.loading')}</p> : store ? (
        <Card>
          <CardHeader><CardTitle>{store.name}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{store.description || t('sellerApplication.noDescription')}</p>
            <div className="flex items-center gap-2"><span>{t('sellerApplication.status')}:</span><Badge variant={statusVariant(store.status)}>{t(`sellerProducts.${store.status}`)}</Badge></div>
            {store.status === 'APPROVED' && <Button asChild><a href="#/seller/products">{t('seller.publishProducts')}</a></Button>}
            {store.status === 'PENDING' && <Alert>{t('sellerApplication.pending')}</Alert>}
            {(store.status === 'REJECTED' || store.status === 'SUSPENDED') && <Alert variant="destructive">{t('sellerApplication.contactSupport')}</Alert>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>{t('sellerApplication.formTitle')}</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
              <label className="grid gap-1.5"><span>{t('seller.storeName')}</span><Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} /></label>
              <label className="grid gap-1.5"><span>{t('sellerApplication.slug')}</span><Input value={slug} onChange={(event) => setSlug(event.target.value)} minLength={2} maxLength={60} /></label>
              <label className="grid gap-1.5"><span>{t('seller.description')}</span><Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></label>
              <label className="grid gap-1.5"><span>{t('sellerApplication.logoUrl')}</span><Input type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} maxLength={500} /></label>
              <Button type="submit" disabled={busy}>{t(busy ? 'auth.loading' : 'sellerApplication.submit')}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SellerApplicationPage() {
  return <I18nLayout><SellerApplicationContent /></I18nLayout>;
}