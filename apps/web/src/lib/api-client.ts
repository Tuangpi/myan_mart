import type { ApiResponse } from '@myanmart/shared';

export class ApiRequestError extends Error {
  constructor(readonly status: number) {
    super(`API request failed with status ${status}`);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init });
  let body: ApiResponse<T>;

  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiRequestError(response.status);
  }

  if (!response.ok || !body.success) {
    throw new ApiRequestError(response.status);
  }

  return body.data;
}

export function jsonRequest(body: unknown): Pick<RequestInit, 'body' | 'headers'> {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
