import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { useI18n, type CartResponse } from '@myanmart/shared';
import { QuantityStepper } from '../components/QuantityStepper';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { I18nLayout } from '../layouts/I18nLayout';
import { cartErrorKey, requestCart } from '../lib/cart';
import { notifyCartUpdated } from '../lib/cart-events';
import { formatMMK } from '../lib/format';
import { getGuestCart, removeGuestCartItem, updateGuestCartItem } from '../lib/guest-cart';
import { useAuth } from '../contexts/auth-context';

function CartContent() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    setLoading(true);
    setCart(null);
    setError('');
    const load = user
      ? requestCart('/api/cart', 'GET', undefined, controller.signal)
      : getGuestCart(controller.signal);
    load
      .then((data) => {
        if (!controller.signal.aborted) setCart(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(cartErrorKey(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [authLoading, reload, user]);

  async function mutate(id: string, quantity?: number) {
    setBusy(true);
    setError('');
    try {
      if (user)
        setCart(
          await requestCart(
            `/api/cart/items/${encodeURIComponent(id)}`,
            quantity === undefined ? 'DELETE' : 'PATCH',
            quantity === undefined ? undefined : { quantity },
          ),
        );
      else {
        if (quantity === undefined) removeGuestCartItem(id);
        else updateGuestCartItem(id, quantity);
        setCart(await getGuestCart());
      }
      notifyCartUpdated();
      setDraftQuantities({});
    } catch (err) {
      setError(cartErrorKey(err));
      if (user) {
        try {
          setCart(await requestCart());
        } catch {
          /* Keep last known cart. */
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const sellerGroups = useMemo(() => {
    const groups = new Map<string, NonNullable<CartResponse>['items']>();
    cart?.items.forEach((item) =>
      groups.set(item.storeSlug, [...(groups.get(item.storeSlug) ?? []), item]),
    );
    return [...groups.entries()].map(([storeSlug, items]) => ({
      storeSlug,
      storeName: items[0]!.storeName,
      items,
    }));
  }, [cart]);
  const checkoutBlocked = cart?.items.some((item) => !item.available || item.quantity > item.stock);

  if (authLoading || loading)
    return (
      <div className="py-16 text-center text-muted-foreground" role="status">
        {t('common.loading')}
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            {t('commerce.bagLabel')}
          </p>
          <h1 className="mt-1 text-3xl font-black">{t('cart.title')}</h1>
        </div>
        <Button asChild variant="outline">
          <a href="#/">
            <ShoppingBag className="size-4" />
            {t('layout.nav.catalog')}
          </a>
        </Button>
      </div>
      {!user && (
        <Card className="border-secondary bg-secondary/35 p-4 text-sm text-secondary-foreground">
          {t('cart.guestNotice')}
        </Card>
      )}
      {error && (
        <Card role="alert" className="border-destructive/30 bg-red-50 p-4 text-red-900">
          <div className="flex items-center justify-between gap-3">
            <span>{t(error)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setReload((value) => value + 1)}
            >
              {t('cart.retry')}
            </Button>
          </div>
        </Card>
      )}
      {cart &&
        (cart.items.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-black">{t('cart.noItems')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('commerce.emptyCartHint')}</p>
            <Button asChild className="mt-6">
              <a href="#/">
                {t('cart.continueShopping')}
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              {sellerGroups.map((group) => (
                <Card key={group.storeSlug} className="overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3 text-sm font-bold">
                    <Store className="size-4 text-primary" />
                    <a
                      className="hover:text-primary"
                      href={`#/stores/${encodeURIComponent(group.storeSlug)}`}
                    >
                      {group.storeName}
                    </a>
                  </div>
                  <ul className="divide-y divide-border">
                    {group.items.map((item) => (
                      <li key={item.id} className="p-4">
                        <div className="flex gap-4">
                          <a
                            href={`#/products/${encodeURIComponent(item.productId)}`}
                            className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                          >
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <span className="grid size-full place-items-center text-muted-foreground">
                                <ShoppingBag className="size-5" />
                              </span>
                            )}
                          </a>
                          <div className="min-w-0 flex-1">
                            <a
                              href={`#/products/${encodeURIComponent(item.productId)}`}
                              className="font-bold hover:text-primary"
                            >
                              {item.name}
                            </a>
                            <p className="mt-1 text-sm font-bold text-primary">
                              {formatMMK(item.unitPrice)}
                            </p>
                            {(!item.available || item.stock < item.quantity) && (
                              <p
                                role="status"
                                className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive"
                              >
                                <AlertTriangle className="size-3.5" />
                                {t(item.available ? 'cart.stockChanged' : 'cart.unavailable')}
                              </p>
                            )}
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <span className="sr-only">
                                  {t('cart.quantity')} — {item.name}
                                </span>
                                <input
                                  className="sr-only"
                                  aria-label={`${t('cart.quantity')} — ${item.name}`}
                                  type="number"
                                  value={draftQuantities[item.id] ?? item.quantity}
                                  min="1"
                                  max={Math.max(1, item.stock)}
                                  disabled={busy || !item.available || item.stock === 0}
                                  onChange={(event) =>
                                    setDraftQuantities((current) => ({
                                      ...current,
                                      [item.id]: Number(event.target.value),
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-2 text-xs"
                                  disabled={busy || !item.available || item.stock === 0}
                                  onClick={() => {
                                    const quantity = draftQuantities[item.id] ?? item.quantity;
                                    if (
                                      Number.isInteger(quantity) &&
                                      quantity >= 1 &&
                                      quantity <= item.stock
                                    )
                                      void mutate(user ? item.id : item.productId, quantity);
                                  }}
                                >
                                  {t('cart.update')}
                                </Button>
                                <QuantityStepper
                                  value={item.quantity}
                                  max={Math.max(1, item.stock)}
                                  disabled={busy || !item.available || item.stock === 0}
                                  label={`${t('cart.quantity')} — ${item.name}`}
                                  onChange={(quantity) =>
                                    void mutate(user ? item.id : item.productId, quantity)
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-black">{formatMMK(item.subtotal)}</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void mutate(user ? item.id : item.productId)}
                                  aria-label={`${t('cart.remove')} — ${item.name}`}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                  <span className="sr-only">{t('cart.remove')}</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            <aside className="h-fit lg:sticky lg:top-28">
              <Card className="p-5">
                <h2 className="text-lg font-black">{t('checkout.orderSummary')}</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {t('cart.subtotal')} ({cart.itemCount})
                    </span>
                    <span>{formatMMK(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('cart.shipping')}</span>
                    <span>{t('commerce.atCheckout')}</span>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between text-base font-black">
                      <span>{t('cart.total')}</span>
                      <span>{formatMMK(cart.subtotal)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('commerce.deliveryAtCheckout')}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="mt-5 w-full"
                  size="lg"
                  disabled={busy || checkoutBlocked}
                >
                  <a href="#/checkout">
                    {t('cart.checkout')}
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                {checkoutBlocked && (
                  <p className="mt-3 text-xs font-semibold text-destructive">
                    {t('checkoutPage.cartChanged')}
                  </p>
                )}
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {t('cart.priceNotice')}
                </p>
              </Card>
            </aside>
          </div>
        ))}
    </div>
  );
}

export function CartPage() {
  return (
    <I18nLayout>
      <CartContent />
    </I18nLayout>
  );
}
