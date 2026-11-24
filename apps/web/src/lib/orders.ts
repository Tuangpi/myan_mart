import { ApiRequestError, apiRequest, jsonRequest } from './api-client';

export class OrderRequestError extends Error {
  constructor(readonly status: number) {
    super('Order request failed');
  }
}

export async function requestOrder<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  method?: 'PATCH',
): Promise<T> {
  try {
    return await apiRequest<T>(path, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      signal,
      ...(body === undefined ? {} : body instanceof FormData ? { body } : jsonRequest(body)),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) throw new OrderRequestError(error.status);
    throw error;
  }
}

export function checkoutErrorKey(error: unknown): string {
  if (error instanceof OrderRequestError) {
    if (error.status === 401) return 'cart.signInRequired';
    if (error.status === 409) return 'checkoutPage.cartChanged';
    if (error.status === 422) return 'checkoutPage.invalid';
  }
  return 'checkoutPage.failed';
}
