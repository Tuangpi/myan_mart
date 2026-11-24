import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../App';

const fetchMock = vi.fn();

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ success: status < 400, ...(status < 400 ? { data } : { error: { code: 'ERROR', message: 'Error' } }) }) };
}

beforeEach(() => {
  window.location.hash = '#/sign-in';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/me') return Promise.resolve(response({}, 401));
    return Promise.resolve(response({ user: { id: 'u1', name: 'May', email: 'may@example.com', phone: '09123456', role: 'BUYER', status: 'ACTIVE' }, token: 'ignored' }));
  });
});

describe('authentication pages', () => {
  it('signs in and navigates to the catalog', async () => {
    localStorage.setItem('myanmart.guest-cart', JSON.stringify([{ productId: 'p1', quantity: 2 }]));
    render(<App />);
    await screen.findByRole('button', { name: 'Sign in' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'may@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/login', expect.objectContaining({ method: 'POST', credentials: 'include' })));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/cart/items', expect.objectContaining({ method: 'POST', body: JSON.stringify({ productId: 'p1', quantity: 2 }) })));
    expect(localStorage.getItem('myanmart.guest-cart')).toBeNull();
    await screen.findByRole('heading', { name: 'Catalog' });
  });

  it('shows a password confirmation error on sign-up', async () => {
    window.location.hash = '#/sign-up';
    render(<App />);
    await screen.findByRole('button', { name: 'Sign up' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'May Myint' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'may@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '09123456' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/register', expect.anything());
  });
});