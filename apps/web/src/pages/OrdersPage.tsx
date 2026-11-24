import { useEffect, useRef, useState } from 'react';
import { useI18n, type OrderResponse, type Paginated } from '@myanmart/shared';
import { I18nLayout } from '../layouts/I18nLayout';
import { OrderRequestError, requestOrder } from '../lib/orders';
import { formatMMK } from '../lib/format';
import { OrderPayments } from '../components/OrderPayments';
import { AccountPageHeader } from '../components/account-page-header';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

function statusVariant(status: string) {
  if (status === 'DELIVERED' || status === 'VERIFIED') return 'success' as const;
  if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'REJECTED')
    return 'destructive' as const;
  if (status === 'SHIPPED' || status === 'PROCESSING' || status === 'SUBMITTED')
    return 'warning' as const;
  return 'secondary' as const;
}

function errorKey(error: unknown): string {
  if (error instanceof OrderRequestError) {
    if (error.status === 401) return 'ordersPage.signIn';
    if (error.status === 404 || error.status === 422) return 'ordersPage.notFound';
    if (error.status === 409) return 'ordersPage.cancelConflict';
  }
  return 'ordersPage.failed';
}

function OrderSummary({ order }: { order: OrderResponse }) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant={statusVariant(order.status)}>
          {t('ordersPage.status')}: {t(`ordersPage.statuses.${order.status}`)}
        </Badge>
        <Badge variant="outline">
          {t('checkout.payment')}: {t(`checkoutPage.${order.paymentMethod}`)}
        </Badge>
        <Badge variant={statusVariant(order.paymentStatus)}>
          {t('ordersPage.paymentStatus')}: {t(`ordersPage.payments.${order.paymentStatus}`)}
        </Badge>
      </div>
      {order.sellerGroups.map((group) => (
        <section
          key={group.storeId}
          className="rounded-xl border border-border bg-muted/35 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-bold">{group.storeName}</h4>
            <span className="text-sm font-bold text-primary">{formatMMK(group.subtotal)}</span>
          </div>
          <ul className="space-y-3">
            {group.items.map((item) => (
              <li
                key={item.id}
                className="border-t border-border/70 pt-3 first:border-0 first:pt-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-medium">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="text-sm font-semibold">{formatMMK(item.subtotal)}</span>
                </div>
                {item.fulfillmentStatus && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('fulfillment.itemStatus')}:{' '}
                    {t(`ordersPage.statuses.${item.fulfillmentStatus}`)}
                  </p>
                )}
                {!!item.fulfillmentHistory?.length && (
                  <ol className="mt-2 space-y-1 border-l border-primary/30 pl-3 text-sm text-muted-foreground">
                    {item.fulfillmentHistory.map((event, index) => (
                      <li key={index}>
                        {t(`ordersPage.statuses.${event.status}`)} —{' '}
                        <time dateTime={event.createdAt}>
                          {new Date(event.createdAt).toLocaleString()}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMMK(item.unitPrice)} / {t('ordersPage.unit')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="ml-auto max-w-xs space-y-2 border-t border-border pt-4 text-sm">
        <p className="flex justify-between">
          <span className="text-muted-foreground">{t('cart.subtotal')}</span>
          <span>{formatMMK(order.subtotal)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">{t('checkoutPage.deliveryFee')}</span>
          <span>{formatMMK(order.deliveryFee)}</span>
        </p>
        <p className="flex justify-between border-t border-border pt-2 text-base font-black">
          <span>{t('cart.total')}</span>
          <span className="text-primary">{formatMMK(order.total)}</span>
        </p>
        <p className="sr-only">
          {t('cart.total')}: {formatMMK(order.total)}
        </p>
      </div>
    </div>
  );
}

function OrdersContent({ id }: { id?: string }) {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Paginated<OrderResponse> | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!id || busy) return;
    let active = true;
    let controller: AbortController | undefined;
    const timer = window.setInterval(() => {
      if (submitting.current || controller) return;
      controller = new AbortController();
      requestOrder<OrderResponse>(
        `/api/orders/${encodeURIComponent(id)}`,
        undefined,
        controller.signal,
      )
        .then((result) => {
          if (active && !submitting.current) setOrder(result);
        })
        .catch(() => {
          /* Keep the last successful state. Manual refresh can report errors. */
        })
        .finally(() => {
          controller = undefined;
        });
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
      controller?.abort();
    };
  }, [id, reload, busy]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setList(null);
    setOrder(null);
    setConfirming(false);
    const path = id
      ? `/api/orders/${encodeURIComponent(id)}`
      : `/api/orders?page=${page}&pageSize=10`;
    requestOrder<OrderResponse | Paginated<OrderResponse>>(path, undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          if ('items' in data) setList(data);
          else setOrder(data);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(errorKey(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, page, reload]);

  async function cancel() {
    if (!order || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      setOrder(
        await requestOrder<OrderResponse>(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {}),
      );
    } catch (err) {
      setError(errorKey(err));
      try {
        setOrder(await requestOrder<OrderResponse>(`/api/orders/${encodeURIComponent(order.id)}`));
      } catch {
        setOrder(null);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
      setConfirming(false);
    }
  }

  function date(value: string) {
    return new Date(value).toLocaleString(locale === 'my' ? 'my-MM' : 'en-US');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AccountPageHeader
        eyebrow={id ? t('ordersPage.title') : t('app.name')}
        title={t(id ? 'ordersPage.details' : 'ordersPage.title')}
        description={id ? t('fulfillment.refreshNote') : t('ordersPage.empty')}
      />
      {id && (
        <Button asChild variant="ghost" className="-ml-3 w-fit">
          <a href="#/orders">← {t('ordersPage.back')}</a>
        </Button>
      )}
      {loading && (
        <div role="status" className="grid gap-4">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="h-52 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}
      {error && (
        <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-3">
          <p>{t(error)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || loading}
            onClick={() => setReload((value) => value + 1)}
          >
            {t('cart.retry')}
          </Button>
        </Alert>
      )}
      {!loading && list && (
        <>
          {list.items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('ordersPage.empty')}
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {list.items.map((entry) => (
                <li key={entry.id}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="break-all">
                          <a
                            href={`#/orders/${encodeURIComponent(entry.id)}`}
                            className="text-primary hover:underline"
                          >
                            {entry.orderNumber}
                          </a>
                        </CardTitle>
                        <Badge variant={statusVariant(entry.status)}>
                          {t(`ordersPage.statuses.${entry.status}`)}
                        </Badge>
                      </div>
                      <CardDescription>
                        {t('ordersPage.placed')}:{' '}
                        <time dateTime={entry.createdAt}>{date(entry.createdAt)}</time>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <OrderSummary order={entry} />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          {list.totalPages > 1 && (
            <nav
              aria-label={t('ordersPage.pagination')}
              className="flex items-center justify-center gap-3"
            >
              <Button
                variant="outline"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                {t('ordersPage.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('ordersPage.page', { page, total: list.totalPages })}
              </span>
              <Button
                variant="outline"
                type="button"
                disabled={page >= list.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('ordersPage.next')}
              </Button>
            </nav>
          )}
        </>
      )}
      {!loading && order && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle className="break-all text-xl">{order.orderNumber}</CardTitle>
              <Badge variant={statusVariant(order.status)}>
                {t(`ordersPage.statuses.${order.status}`)}
              </Badge>
            </div>
            <CardDescription>
              {t('ordersPage.placed')}:{' '}
              <time dateTime={order.createdAt}>{date(order.createdAt)}</time>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <OrderSummary order={order} />
            <section className="rounded-xl bg-muted/45 p-4 space-y-3">
              <h4 className="font-semibold">{t('fulfillment.timeline')}</h4>
              <p className="text-sm text-muted-foreground">{t('fulfillment.refreshNote')}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setReload((n) => n + 1)}
              >
                {t('payment.retry')}
              </Button>
              <ol className="space-y-2 border-l border-primary/30 pl-3 text-sm">
                {order.statusHistory?.map((event, index) => (
                  <li key={index}>
                    {t(`ordersPage.statuses.${event.status}`)} —{' '}
                    <time dateTime={event.createdAt}>{date(event.createdAt)}</time>
                  </li>
                ))}
              </ol>
            </section>
            <OrderPayments orderId={order.id} onChange={() => setReload((value) => value + 1)} />
            <section className="rounded-xl border border-border p-4 space-y-2">
              <h4 className="font-semibold">{t('checkout.address')}</h4>
              <p>
                {order.address.recipientName} — {order.address.phone}
              </p>
              <p>
                {order.address.address}, {order.address.city}, {order.address.region}
              </p>
              {order.address.notes && <p>{order.address.notes}</p>}
            </section>
            {order.canCancel &&
              (confirming ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <p>{t('ordersPage.confirmPrompt')}</p>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancel()}
                    variant="destructive"
                  >
                    {t('ordersPage.confirmCancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirming(false)}
                  >
                    {t('ordersPage.keep')}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                  variant="destructive"
                >
                  {t('ordersPage.cancel')}
                </Button>
              ))}
            {order.status === 'CANCELLED' && (
              <Alert variant="success" role="status">
                {t('ordersPage.cancelled')}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function OrdersPage({ id }: { id?: string } = {}) {
  return (
    <I18nLayout>
      <OrdersContent key={id ?? 'list'} id={id} />
    </I18nLayout>
  );
}
