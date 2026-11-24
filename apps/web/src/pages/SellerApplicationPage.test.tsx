import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';

const fetchMock = vi.fn();
const buyer = { id: 'u1', name: 'May', email: 'may@example.com', phone: '09123456', role: 'BUYER', status: 'ACTIVE' };

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ success: status < 400, ...(status < 400 ? { data } : { error: { code: 'ERROR', message: 'Error' } }) }) };
}

beforeEach(() => {
  window.location.hash = '#/seller/apply';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  let applicationSubmitted = false;
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/me') return Promise.resolve(response(buyer));
    if (url === '/api/seller/store' && !init?.method) return Promise.resolve(response(applicationSubmitted ? [{ id: 's1', name: 'May Store', slug: 'may-store', description: null, logoUrl: null, status: 'PENDING' }] : []));
    if (url === '/api/seller/apply') {
      applicationSubmitted = true;
      return Promise.resolve(response({ id: 's1', name: 'May Store', slug: 'may-store', description: null, logoUrl: null, status: 'PENDING' }, 201));
    }
    return Promise.resolve(response([]));
  });
});

describe('seller application page', () => {
  it('submits a store application and shows its pending status', async () => {
    render(<App />);
    await screen.findByLabelText('Store name');
    fireEvent.change(screen.getByLabelText('Store name'), { target: { value: 'May Store' } });
    fireEvent.change(screen.getByLabelText('Store URL name (optional)'), { target: { value: 'may-store' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/seller/apply', expect.objectContaining({ method: 'POST', credentials: 'include' })));
    expect(await screen.findByText('Your application is pending administrator review.')).toBeInTheDocument();
  });
});