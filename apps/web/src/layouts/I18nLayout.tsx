import { I18nProvider, useI18n } from '@myanmart/shared';
import {
  ShoppingBag,
  Package,
  Store,
  ClipboardList,
  ShieldCheck,
  UserRound,
  Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/auth-context';
import { CART_UPDATED_EVENT } from '../lib/cart-events';
import { readGuestCart } from '../lib/guest-cart';
import { requestCart } from '../lib/cart';

export function I18nLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <I18nLayoutInner>{children}</I18nLayoutInner>
    </I18nProvider>
  );
}

function I18nLayoutInner({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, t } = useI18n();
  const { user, loading, signOut } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const path = window.location.hash.replace(/^#/, '') || '/';
  const navItems = [
    { href: '#/', label: t('sellerProducts.catalog'), icon: ShoppingBag, active: path === '/' },
    { href: '#/cart', label: t('cart.title'), icon: Package, active: path === '/cart' },
    {
      href: '#/orders',
      label: t('ordersPage.title'),
      icon: ClipboardList,
      active: path.startsWith('/orders'),
    },
    {
      href: '#/seller/products',
      label: t('sellerProducts.title'),
      icon: Store,
      active: path.startsWith('/seller/products'),
    },
    {
      href: '#/seller/orders',
      label: t('fulfillment.title'),
      icon: ClipboardList,
      active: path.startsWith('/seller/orders'),
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.href.startsWith('#/seller')) return user?.role === 'SELLER' || user?.role === 'ADMIN';
    if (item.href === '#/orders') return !!user;
    return true;
  });

  async function handleSignOut() {
    await signOut();
    window.location.hash = '#/';
  }

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const refreshCartCount = () => {
      if (!user) {
        if (!cancelled)
          setCartCount(readGuestCart().reduce((total, entry) => total + entry.quantity, 0));
        return;
      }
      void requestCart()
        .then((cart) => {
          if (!cancelled) setCartCount(cart.itemCount);
        })
        .catch(() => {
          if (!cancelled) setCartCount(0);
        });
    };
    refreshCartCount();
    window.addEventListener(CART_UPDATED_EVENT, refreshCartCount);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount);
    };
  }, [loading, user]);

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <a
            href="#/"
            className="mr-auto flex items-center gap-2 text-xl font-black tracking-tight text-foreground"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-xl bg-primary text-sm text-primary-foreground"
            >
              M
            </span>
            <h1>{t('app.name')}</h1>
          </a>
          <nav
            className="order-3 flex w-full gap-1 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:pb-0"
            aria-label="Primary navigation"
          >
            {visibleNavItems.map(({ href, label, icon: Icon, active }) => (
              <a
                key={href}
                href={href}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="size-4" />
                  {href === '#/cart' && cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
                {label}
              </a>
            ))}
          </nav>
          {(user?.role === 'SELLER' || user?.role === 'ADMIN') && (
            <details className="relative">
              <summary
                className="cursor-pointer list-none rounded-lg px-2 py-2 text-muted-foreground hover:bg-muted"
                aria-label="Operations navigation"
              >
                <ShieldCheck className="size-5" />
              </summary>
              <div className="absolute right-0 top-11 z-30 grid w-52 gap-1 rounded-xl border border-border bg-card p-2 shadow-lg">
                {user.role === 'SELLER' && (
                  <a
                    className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                    href="#/payments/seller"
                  >
                    {t('payment.sellerReview')}
                  </a>
                )}
                {user.role === 'ADMIN' && (
                  <>
                    <a
                      className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                      href="#/payments/admin"
                    >
                      {t('payment.adminReview')}
                    </a>
                    <a className="rounded-lg px-3 py-2 text-sm hover:bg-muted" href="#/admin">
                      {t('admin.dashboard')}
                    </a>
                  </>
                )}
              </div>
            </details>
          )}
          {!loading &&
            (user ? (
              <details className="relative">
                <summary
                  className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                  aria-label={t('account.menu')}
                >
                  <UserRound className="size-5" />
                  <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
                </summary>
                <div className="absolute right-0 top-11 z-30 grid w-52 gap-1 rounded-xl border border-border bg-card p-2 shadow-lg">
                  <a className="rounded-lg px-3 py-2 text-sm hover:bg-muted" href="#/profile">
                    {t('account.profile')}
                  </a>
                  <a className="rounded-lg px-3 py-2 text-sm hover:bg-muted" href="#/settings">
                    {t('account.settings')}
                  </a>
                  {user.role === 'BUYER' && (
                    <a
                      className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                      href="#/seller/apply"
                    >
                      {t('account.becomeSeller')}
                    </a>
                  )}
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => void handleSignOut()}
                  >
                    {t('auth.signOut')}
                  </button>
                </div>
              </details>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="ghost">
                  <a href="#/sign-in">{t('auth.signIn')}</a>
                </Button>
                <Button asChild size="sm">
                  <a href="#/sign-up">{t('auth.signUp')}</a>
                </Button>
              </div>
            ))}
          <div className="flex rounded-lg border border-border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={locale === 'en' ? 'default' : 'ghost'}
              onClick={() => setLocale('en')}
            >
              EN
            </Button>
            <Button
              type="button"
              size="sm"
              variant={locale === 'my' ? 'default' : 'ghost'}
              onClick={() => setLocale('my')}
            >
              MY
            </Button>
          </div>
        </div>
        <div className="border-t border-border/70 bg-card/80">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold text-muted-foreground sm:px-6 lg:px-8">
            <Truck className="size-3.5 text-primary" />
            <span>{t('commerce.trustBar')}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </section>

      <footer className="mt-8 border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {t('app.tagline')}
      </footer>
    </main>
  );
}
