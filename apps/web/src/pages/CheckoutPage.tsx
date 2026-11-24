import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Landmark, MapPin, Truck, WalletCards } from 'lucide-react';
import {
  checkoutSchema,
  PAYMENT_METHODS,
  useI18n,
  type CheckoutQuote,
  type OrderResponse,
} from '@myanmart/shared';
import { CheckoutProgress } from '../components/CheckoutProgress';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { I18nLayout } from '../layouts/I18nLayout';
import { formatMMK } from '../lib/format';
import { checkoutErrorKey, requestOrder } from '../lib/orders';

const fields = ['recipientName', 'phone', 'region', 'city', 'address', 'notes'] as const;
const paymentIcons = {
  COD: Truck,
  KBZPAY: WalletCards,
  WAVEPAY: WalletCards,
  BANK_TRANSFER: Landmark,
};

function OrderSummary({ quote }: { quote: CheckoutQuote }) {
  const { t } = useI18n();
  return (
    <Card className="p-5">
      <p className="sr-only">{`${t('checkoutPage.deliveryFee')}: ${formatMMK(quote.deliveryFee)}`}</p>
      <p className="sr-only">{`${t('cart.total')}: ${formatMMK(quote.total)}`}</p>
      <h2 className="text-lg font-black">{t('checkout.orderSummary')}</h2>
      <ul className="mt-4 space-y-3">
        {quote.cart.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
              </span>
              <span className="text-xs text-muted-foreground">{item.storeName}</span>
            </span>
            <span className="shrink-0 font-semibold">{formatMMK(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{t('cart.subtotal')}</span>
          <span>{formatMMK(quote.cart.subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{t('checkoutPage.deliveryFee')}</span>
          <span>{formatMMK(quote.deliveryFee)}</span>
        </div>
        <div className="flex justify-between pt-2 text-base font-black">
          <span>{t('cart.total')}</span>
          <span>{formatMMK(quote.total)}</span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {t('checkoutPage.priceNotice')}
      </p>
    </Card>
  );
}

function CheckoutContent() {
  const { t } = useI18n();
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setQuote(null);
    setError('');
    requestOrder<CheckoutQuote>('/api/checkout', undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setQuote(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(checkoutErrorKey(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const blocked =
    !quote ||
    quote.cart.items.length === 0 ||
    quote.cart.items.some((item) => !item.available || item.quantity > item.stock);
  if (order)
    return (
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-10">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h1 className="mt-4 text-3xl font-black text-emerald-950">{t('checkoutPage.success')}</h1>
          <p className="mt-2 text-sm text-emerald-900">
            {`${t('checkoutPage.orderNumber')}: ${order.orderNumber}`}
          </p>
          {order.paymentMethod !== 'COD' && (
            <p className="mx-auto mt-4 max-w-lg text-sm text-emerald-900">
              {t('checkoutPage.prepaidNotice')}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <a href={`#/orders/${encodeURIComponent(order.id)}`}>{t('ordersPage.details')}</a>
            </Button>
            <Button asChild variant="outline">
              <a href="#/">{t('cart.continueShopping')}</a>
            </Button>
          </div>
        </section>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {order.sellerGroups.map((group) => (
            <Card key={group.storeId} className="p-5">
              <h2 className="font-black">{group.storeName}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {group.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="sr-only">{`${item.productName} × ${item.quantity} — ${formatMMK(item.subtotal)}`}</span>
                    <span>
                      {item.productName} × {item.quantity}
                    </span>
                    <span>{formatMMK(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-border pt-3 font-bold">
                {t('cart.subtotal')}: {formatMMK(group.subtotal)}
              </p>
            </Card>
          ))}
        </div>
        <Card className="mt-5 p-5">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p>{`${t('checkoutPage.status')}: ${t(`checkoutPage.${order.status}`)}`}</p>
            <p>{`${t('checkout.payment')}: ${t(`checkoutPage.${order.paymentMethod}`)}`}</p>
            <p className="font-black">
              {t('cart.total')}: {formatMMK(order.total)}
            </p>
          </div>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          {t('commerce.secureCheckout')}
        </p>
        <h1 className="mt-1 text-3xl font-black">{t('checkout.title')}</h1>
      </div>
      <CheckoutProgress />
      {loading && (
        <p role="status" className="py-12 text-center text-muted-foreground">
          {t('common.loading')}
        </p>
      )}
      {error && (
        <Card role="alert" className="border-destructive/30 bg-red-50 p-4 text-red-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t(error)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || loading}
              onClick={() => setReload((value) => value + 1)}
            >
              {t('cart.retry')}
            </Button>
          </div>
        </Card>
      )}
      {quote &&
        (quote.cart.items.length === 0 ? (
          <Card className="p-10 text-center">
            <h2 className="text-xl font-black">{t('cart.noItems')}</h2>
            <Button asChild className="mt-5">
              <a href="#/">{t('cart.continueShopping')}</a>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (submitting.current || blocked) return;
                const form = new FormData(event.currentTarget);
                const parsed = checkoutSchema.safeParse({
                  address: Object.fromEntries(fields.map((field) => [field, form.get(field)])),
                  paymentMethod,
                });
                if (!parsed.success) {
                  setError('checkoutPage.invalid');
                  return;
                }
                submitting.current = true;
                setBusy(true);
                setError('');
                requestOrder<OrderResponse>('/api/orders', parsed.data)
                  .then(setOrder)
                  .catch((err) => {
                    setError(checkoutErrorKey(err));
                    setQuote(null);
                  })
                  .finally(() => {
                    submitting.current = false;
                    setBusy(false);
                  });
              }}
            >
              <fieldset disabled={busy || blocked} className="space-y-5">
                <Card className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      <MapPin className="size-5" />
                    </span>
                    <h2 className="text-lg font-black">{t('checkout.address')}</h2>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {fields.map((field) => (
                      <label
                        key={field}
                        className={field === 'address' || field === 'notes' ? 'sm:col-span-2' : ''}
                      >
                        <span className="mb-1.5 block text-sm font-semibold">
                          {t(`checkoutPage.${field}`)}
                        </span>
                        <Input
                          name={field}
                          type={field === 'phone' ? 'tel' : 'text'}
                          required={field !== 'notes'}
                          minLength={
                            field === 'recipientName'
                              ? 2
                              : field === 'phone'
                                ? 6
                                : field === 'address'
                                  ? 5
                                  : 1
                          }
                          maxLength={
                            field === 'phone'
                              ? 20
                              : field === 'address' || field === 'notes'
                                ? 1000
                                : 100
                          }
                        />
                      </label>
                    ))}
                  </div>
                </Card>
                <Card className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      <CreditCard className="size-5" />
                    </span>
                    <h2 className="text-lg font-black">{t('checkout.payment')}</h2>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <select
                      className="sr-only"
                      value={paymentMethod}
                      aria-label={t('checkout.payment')}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {t(`checkoutPage.${method}`)}
                        </option>
                      ))}
                    </select>
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = paymentIcons[method];
                      return (
                        <label
                          key={method}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${paymentMethod === method ? 'border-primary bg-secondary/40' : 'border-border hover:bg-muted/60'}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={() => setPaymentMethod(method)}
                            className="size-4 accent-primary"
                          />
                          <Icon className="size-5 text-primary" />
                          <span>
                            <span className="block text-sm font-bold">
                              {t(`checkoutPage.${method}`)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {method === 'COD'
                                ? t('payment.cod')
                                : t('checkoutPage.prepaidNotice')}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Card>
                {blocked && (
                  <Card
                    role="alert"
                    className="border-destructive/30 bg-red-50 p-4 text-sm text-red-900"
                  >
                    {t('checkoutPage.cartChanged')}
                  </Card>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={busy || blocked}
                  aria-label={t(busy ? 'common.loading' : 'checkout.placeOrder')}
                >
                  {t(busy ? 'common.loading' : 'checkout.placeOrder')}
                  {quote && !busy && <span aria-hidden="true"> · {formatMMK(quote.total)}</span>}
                </Button>
              </fieldset>
            </form>
            <aside className="h-fit lg:sticky lg:top-28">
              <OrderSummary quote={quote} />
            </aside>
          </div>
        ))}
    </div>
  );
}

export function CheckoutPage() {
  return (
    <I18nLayout>
      <CheckoutContent />
    </I18nLayout>
  );
}
