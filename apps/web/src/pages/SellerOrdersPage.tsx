import { useEffect, useRef, useState } from 'react';
import {
  useI18n,
  type Paginated,
  type SellerOrderResponse,
  type SellerSalesSummary,
  type SellerPaymentInstructions,
} from '@myanmart/shared';
import { I18nLayout } from '../layouts/I18nLayout';
import { requestOrder, OrderRequestError } from '../lib/orders';
import { formatMMK } from '../lib/format';
import { AccountPageHeader } from '../components/account-page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';

function statusVariant(status: string) {
  if (status === 'DELIVERED' || status === 'VERIFIED') return 'success' as const;
  if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'REJECTED')
    return 'destructive' as const;
  if (status === 'SHIPPED' || status === 'PROCESSING' || status === 'SUBMITTED')
    return 'warning' as const;
  return 'secondary' as const;
}

function SellerOrdersContent() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Paginated<SellerOrderResponse> | null>(null);
  const [summary, setSummary] = useState<SellerSalesSummary | null>(null);
  const [instructions, setInstructions] = useState<SellerPaymentInstructions | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setOrders(null);
    Promise.all([
      requestOrder<Paginated<SellerOrderResponse>>(
        `/api/seller/orders?page=${page}&pageSize=10`,
        undefined,
        controller.signal,
      ),
      requestOrder<SellerSalesSummary>('/api/seller/sales-summary', undefined, controller.signal),
      requestOrder<SellerPaymentInstructions>(
        '/api/seller/payment-instructions',
        undefined,
        controller.signal,
      ),
    ])
      .then(([list, totals, saved]) => {
        if (!controller.signal.aborted) {
          setOrders(list);
          setSummary(totals);
          setInstructions(saved);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof OrderRequestError && [401, 403].includes(err.status)
              ? 'payment.forbidden'
              : 'payment.failed',
          );
      });
    return () => controller.abort();
  }, [page, reload]);
  async function action(path: string, body: unknown, saved = false) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await requestOrder(path, body, undefined, 'PATCH');
      if (saved) setMessage('fulfillment.saved');
    } catch {
      setError('payment.failed');
    } finally {
      submitting.current = false;
      setBusy(false);
      setReload((n) => n + 1);
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AccountPageHeader
        eyebrow={t('sellerProducts.title')}
        title={t('fulfillment.title')}
        description={t('fulfillment.scope')}
        action={
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError('');
              setReload((n) => n + 1);
            }}
          >
            {t('payment.retry')}
          </Button>
        }
      />
      {error && <Alert variant="destructive">{t(error)}</Alert>}
      {message && (
        <Alert variant="success" role="status">
          {t(message)}
        </Alert>
      )}
      {!orders && !error && (
        <div role="status" className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}
      {summary && (
        <section>
          <h3 className="mb-3 text-sm font-bold tracking-wide text-muted-foreground uppercase">
            {t('fulfillment.summary')}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{t('fulfillment.orderCount')}</p>
                <p className="mt-1 text-3xl font-black">{summary.orderCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{t('fulfillment.delivered')}</p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {formatMMK(summary.deliveredSubtotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">{t('fulfillment.active')}</p>
                <p className="mt-1 text-xl font-black text-primary">
                  {formatMMK(summary.activeSubtotal)}
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {t('fulfillment.summaryNote')}
          </p>
        </section>
      )}
      {instructions && (
        <form
          className="rounded-2xl border border-border bg-card p-5 space-y-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void action('/api/seller/payment-instructions', instructions, true);
          }}
        >
          <div>
            <h3 className="font-bold">{t('fulfillment.instructions')}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('fulfillment.instructionsNote')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(['KBZPAY', 'WAVEPAY', 'BANK_TRANSFER'] as const).map((method) => (
              <label className="grid gap-2 text-sm font-semibold" key={method}>
                {t(`checkoutPage.${method}`)}
                <Textarea
                  maxLength={2000}
                  disabled={busy}
                  value={instructions[method]}
                  onChange={(event) =>
                    setInstructions({ ...instructions, [method]: event.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <Button disabled={busy}>{t('fulfillment.save')}</Button>
        </form>
      )}
      {orders?.items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('ordersPage.empty')}
          </CardContent>
        </Card>
      )}
      <section className="space-y-4">
        {orders?.items.map((order) => (
          <Card key={order.id}>
            <CardHeader className="gap-3 border-b border-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="break-all text-lg">{order.orderNumber}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariant(order.status)}>
                    {t(`ordersPage.statuses.${order.status}`)}
                  </Badge>
                  <Badge variant={statusVariant(order.paymentStatus)}>
                    {t(`ordersPage.payments.${order.paymentStatus}`)}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {order.address.recipientName} — {order.address.phone} · {order.address.city},{' '}
                {order.address.region}
              </CardDescription>
              <p className="sr-only">
                {order.address.recipientName} — {order.address.phone}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted/50 p-3">
                <div>
                  <p className="font-semibold">{order.address.address}</p>
                  {order.address.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{order.address.notes}</p>
                  )}
                </div>
                <p className="text-sm font-bold text-primary">
                  {t('cart.subtotal')}: {formatMMK(order.subtotal)}
                </p>
              </div>
              <ul className="grid gap-3">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.productName} × {item.quantity}
                      </p>
                      <p className="sr-only">
                        {item.productName} × {item.quantity} — {formatMMK(item.subtotal)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(item.fulfillmentStatus ?? 'CONFIRMED')}>
                          {t(`ordersPage.statuses.${item.fulfillmentStatus ?? 'CONFIRMED'}`)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatMMK(item.subtotal)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.allowedStatuses.map((status) => (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          key={status}
                          onClick={() => {
                            if (
                              window.confirm(
                                t(
                                  order.paymentMethod === 'COD' && status === 'DELIVERED'
                                    ? 'fulfillment.confirmCod'
                                    : 'payment.confirmStatus',
                                ),
                              )
                            )
                              void action(
                                `/api/seller/orders/${encodeURIComponent(order.id)}/status`,
                                {
                                  itemId: item.id,
                                  status,
                                },
                              );
                          }}
                        >
                          {t(`ordersPage.statuses.${status}`)}
                        </Button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>
      {orders && orders.totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-3"
          aria-label={t('ordersPage.pagination')}
        >
          <Button
            variant="outline"
            disabled={busy || page <= 1}
            onClick={() => {
              setError('');
              setPage((n) => n - 1);
            }}
          >
            {t('ordersPage.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('ordersPage.page', { page, total: orders.totalPages })}
          </span>
          <Button
            variant="outline"
            disabled={busy || page >= orders.totalPages}
            onClick={() => {
              setError('');
              setPage((n) => n + 1);
            }}
          >
            {t('ordersPage.next')}
          </Button>
        </nav>
      )}
    </div>
  );
}

export function SellerOrdersPage() {
  return (
    <I18nLayout>
      <SellerOrdersContent />
    </I18nLayout>
  );
}
