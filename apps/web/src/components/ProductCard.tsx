import { ShoppingBag, Store } from 'lucide-react';
import { useState } from 'react';
import { useI18n, type ProductSummary } from '@myanmart/shared';
import { useAuth } from '../contexts/auth-context';
import { cartErrorKey, requestCart } from '../lib/cart';
import { notifyCartUpdated } from '../lib/cart-events';
import { addGuestCartItem } from '../lib/guest-cart';
import { formatMMK } from '../lib/format';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';

export function ProductCard({ product }: { product: ProductSummary }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const inStock = product.stock > 0;

  async function addToCart() {
    setAdding(true);
    setMessage('');
    try {
      if (user)
        await requestCart('/api/cart/items', 'POST', { productId: product.id, quantity: 1 });
      else addGuestCartItem(product.id);
      notifyCartUpdated();
      setMessage('cart.added');
    } catch (error) {
      setMessage(cartErrorKey(error));
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
      <a
        href={`#/products/${encodeURIComponent(product.id)}`}
        className="relative block aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <ShoppingBag className="size-10" />
            <span className="sr-only">{t('catalogPage.noImage')}</span>
          </div>
        )}
        <Badge
          variant={inStock ? 'success' : 'destructive'}
          className="absolute right-3 top-3 shadow-sm"
        >
          {inStock ? t('catalogPage.inStock', { count: product.stock }) : t('product.outOfStock')}
        </Badge>
      </a>
      <div className="flex flex-1 flex-col p-4">
        {product.categoryName && (
          <span className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {product.categoryName}
          </span>
        )}
        <a
          href={`#/products/${encodeURIComponent(product.id)}`}
          className="line-clamp-2 font-bold leading-5 text-foreground hover:text-primary"
        >
          {product.name}
        </a>
        <p className="mt-2 text-lg font-black text-primary">{formatMMK(product.price)}</p>
        <a
          href={`#/stores/${encodeURIComponent(product.storeSlug)}`}
          className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <Store className="size-3.5" />
          {product.storeName}
        </a>
        <div className="mt-4 flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <a href={`#/products/${encodeURIComponent(product.id)}`}>{t('common.view')}</a>
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1"
            disabled={!inStock || adding}
            onClick={() => void addToCart()}
          >
            <ShoppingBag className="size-4" />
            {t('product.addToCart')}
          </Button>
        </div>
        {message && (
          <p
            role={message === 'cart.added' ? 'status' : 'alert'}
            className="mt-3 text-xs text-muted-foreground"
          >
            {t(message)}
          </p>
        )}
      </div>
    </Card>
  );
}
