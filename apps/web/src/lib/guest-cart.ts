import type { CartItemResponse, CartResponse, ProductDetail } from '@myanmart/shared';
import { ApiRequestError, apiRequest } from './api-client';
import { notifyCartUpdated } from './cart-events';

const STORAGE_KEY = 'myanmart.guest-cart';

export interface GuestCartEntry {
  productId: string;
  quantity: number;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function readGuestCart(): GuestCartEntry[] {
  if (!canUseStorage()) return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): GuestCartEntry[] => {
      if (!entry || typeof entry !== 'object') return [];
      const { productId, quantity } = entry as Record<string, unknown>;
      return typeof productId === 'string' &&
        productId &&
        Number.isInteger(quantity) &&
        Number(quantity) > 0
        ? [{ productId, quantity: Number(quantity) }]
        : [];
    });
  } catch {
    return [];
  }
}

export function writeGuestCart(entries: GuestCartEntry[]): void {
  if (!canUseStorage()) return;
  if (entries.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    notifyCartUpdated();
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  notifyCartUpdated();
}

export function addGuestCartItem(productId: string, quantity = 1): void {
  const entries = readGuestCart();
  const existing = entries.find((entry) => entry.productId === productId);
  if (existing) existing.quantity += quantity;
  else entries.push({ productId, quantity });
  writeGuestCart(entries);
}

export function updateGuestCartItem(productId: string, quantity: number): void {
  writeGuestCart(
    readGuestCart().flatMap((entry) =>
      entry.productId === productId && quantity > 0
        ? [{ productId, quantity }]
        : entry.productId === productId
          ? []
          : [entry],
    ),
  );
}

export function removeGuestCartItem(productId: string): void {
  writeGuestCart(readGuestCart().filter((entry) => entry.productId !== productId));
}

export function clearGuestCart(): void {
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
    notifyCartUpdated();
  }
}

function unavailableItem(entry: GuestCartEntry): CartItemResponse {
  return {
    id: entry.productId,
    productId: entry.productId,
    name: entry.productId,
    slug: entry.productId,
    thumbnailUrl: null,
    storeName: '',
    storeSlug: '',
    quantity: entry.quantity,
    stock: 0,
    available: false,
    unitPrice: 0,
    subtotal: 0,
  };
}

function toCartItem(product: ProductDetail, quantity: number): CartItemResponse {
  return {
    id: product.id,
    productId: product.id,
    name: product.name,
    slug: product.slug,
    thumbnailUrl: product.images[0]?.imageUrl ?? null,
    storeName: product.store.name,
    storeSlug: product.store.slug,
    quantity,
    stock: product.stock,
    available: product.status === 'ACTIVE' && product.store.status === 'APPROVED',
    unitPrice: product.price,
    subtotal: product.price * quantity,
  };
}

export async function getGuestCart(signal?: AbortSignal): Promise<CartResponse> {
  const entries = readGuestCart();
  const items = await Promise.all(
    entries.map(async (entry) => {
      try {
        const product = await apiRequest<ProductDetail>(
          `/api/products/${encodeURIComponent(entry.productId)}`,
          { signal },
        );
        return toCartItem(product, entry.quantity);
      } catch (error) {
        if (!(error instanceof ApiRequestError)) throw error;
        return unavailableItem(entry);
      }
    }),
  );
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}
