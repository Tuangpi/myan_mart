import { useEffect, useState } from 'react';
import { CheckCircle2, ImageOff, ShieldCheck, ShoppingBag, Store, Truck } from 'lucide-react';
import { useI18n, type ProductDetail } from '@myanmart/shared';
import { QuantityStepper } from '../components/QuantityStepper';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { I18nLayout } from '../layouts/I18nLayout';
import { apiRequest } from '../lib/api-client';
import { cartErrorKey, requestCart } from '../lib/cart';
import { notifyCartUpdated } from '../lib/cart-events';
import { formatMMK } from '../lib/format';
import { addGuestCartItem } from '../lib/guest-cart';
import { useAuth } from '../contexts/auth-context';

interface ProductDetailPageProps {
  id?: string;
  productId?: string;
  slug?: string;
  productSlug?: string;
  product?: ProductDetail;
}
function resolveId(props: ProductDetailPageProps): string {
  const value =
    props.id ||
    props.productId ||
    props.slug ||
    props.productSlug ||
    props.product?.id ||
    props.product?.slug;
  if (value) return value;
  if (typeof window === 'undefined') return '';
  const match = window.location.hash.match(/#\/?products?\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]!) : '';
}

function ProductDetailContent(props: ProductDetailPageProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const id = resolveId(props);
  const [product, setProduct] = useState<ProductDetail | null>(props.product ?? null);
  const [loading, setLoading] = useState(!props.product);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [cartFailed, setCartFailed] = useState(false);

  useEffect(() => {
    if (props.product) {
      setProduct(props.product);
      setLoading(false);
      setError(false);
      return;
    }
    if (!id) {
      setLoading(false);
      setError(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    apiRequest<ProductDetail>(`/api/products/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setProduct(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, props.product]);

  async function addToCart(goToCheckout = false) {
    if (!product) return;
    setAdding(true);
    setCartMessage('');
    setCartFailed(false);
    try {
      if (user) await requestCart('/api/cart/items', 'POST', { productId: product.id, quantity });
      else addGuestCartItem(product.id, quantity);
      notifyCartUpdated();
      setCartMessage('cart.added');
      if (goToCheckout) window.location.hash = user ? '#/checkout' : '#/cart';
    } catch (err) {
      setCartFailed(true);
      setCartMessage(cartErrorKey(err));
    } finally {
      setAdding(false);
    }
  }

  if (loading)
    return (
      <div className="py-16 text-center text-muted-foreground" role="status">
        {t('common.loading')}
      </div>
    );
  if (error || !product)
    return (
      <div className="py-16 text-center" role="alert">
        <h1 className="text-xl font-bold">{t('errors.notFound')}</h1>
        <Button asChild variant="outline" className="mt-5">
          <a href="#/">{t('cart.continueShopping')}</a>
        </Button>
      </div>
    );
  const mainImage = product.images[imageIndex]?.imageUrl ?? null;
  const inStock = product.stock > 0;

  return (
    <div className="space-y-6">
      <a href="#/" className="text-sm font-semibold text-primary hover:underline">
        ← {t('common.back')}
      </a>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
        <section>
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-muted shadow-sm">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <ImageOff className="size-12" />
                <span className="sr-only">{t('catalogPage.noImage')}</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((image, index) => (
                <button
                  type="button"
                  key={image.id}
                  aria-label={`${product.name} image ${index + 1}`}
                  onClick={() => setImageIndex(index)}
                  className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 ${imageIndex === index ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={image.imageUrl} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
            <Badge variant={inStock ? 'success' : 'destructive'}>
              {inStock
                ? t('catalogPage.inStock', { count: product.stock })
                : t('product.outOfStock')}
            </Badge>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-3 text-3xl font-black text-primary">{formatMMK(product.price)}</p>
          </div>
          <Card className="p-4">
            <a
              href={`#/stores/${encodeURIComponent(product.store.slug)}`}
              className="flex items-center gap-3"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Store className="size-5" />
              </span>
              <span>
                <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t('product.soldBy')}
                </span>
                <span className="font-bold hover:text-primary">{product.store.name}</span>
              </span>
            </a>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-bold">{t('cart.quantity')}</span>
            <QuantityStepper
              value={quantity}
              max={Math.max(1, product.stock)}
              disabled={!inStock || adding}
              label={`${t('cart.quantity')} — ${product.name}`}
              onChange={setQuantity}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={!inStock || adding}
              onClick={() => void addToCart()}
            >
              <ShoppingBag className="size-5" />
              {inStock ? t('product.addToCart') : t('product.outOfStock')}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!inStock || adding}
              onClick={() => void addToCart(true)}
            >
              {t('product.buyNow')}
            </Button>
          </div>
          {cartMessage && (
            <div
              role={cartFailed ? 'alert' : 'status'}
              className={`rounded-xl p-3 text-sm ${cartFailed ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  {t(cartMessage)}
                </span>
                {!cartFailed && (
                  <a href="#/cart" className="font-bold underline">
                    {t('cart.title')}
                  </a>
                )}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
              {t('commerce.deliveryAssurance')}
            </div>
            <div className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              {t('commerce.stockAssurance')}
            </div>
          </div>
        </section>
      </div>
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-black">{t('product.description')}</h2>
        <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">
          {product.description || '--'}
        </p>
      </Card>
    </div>
  );
}

export function ProductDetailPage(props: ProductDetailPageProps = {}) {
  return (
    <I18nLayout>
      <ProductDetailContent {...props} />
    </I18nLayout>
  );
}
