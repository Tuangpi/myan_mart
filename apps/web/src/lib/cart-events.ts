export const CART_UPDATED_EVENT = 'myanmart:cart-updated';

export function notifyCartUpdated(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
