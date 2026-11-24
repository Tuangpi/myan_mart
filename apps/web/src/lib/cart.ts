import type { CartResponse } from '@myanmart/shared';
import { ApiRequestError, apiRequest, jsonRequest } from './api-client';

export class CartRequestError extends Error {
  constructor(readonly status: number) {
    super('Cart request failed');
  }
}

export async function requestCart(
  path = '/api/cart',
  method = 'GET',
  body?: unknown,
  signal?: AbortSignal,
): Promise<CartResponse> {
  try {
    return await apiRequest<CartResponse>(path, {
      method,
      signal,
      ...(body === undefined ? {} : jsonRequest(body)),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) throw new CartRequestError(error.status);
    throw error;
  }
}

export function cartErrorKey(error: unknown): string {
  if (error instanceof CartRequestError) {
    if (error.status === 401) return 'cart.signInRequired';
    if (error.status === 409) return 'cart.stockChanged';
  }
  return 'cart.updateFailed';
}
