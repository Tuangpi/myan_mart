import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CartResponse, ProductDetail } from '@myanmart/shared';
import { CartPage } from './CartPage';
import { ProductDetailPage } from './ProductDetailPage';
import { App } from '../App';

const fetchMock = vi.fn();
const empty: CartResponse = { items: [], itemCount: 0, subtotal: 0 };
const product: ProductDetail = {
  id: 'product',
  name: 'Tea',
  slug: 'tea',
  description: null,
  price: 1500,
  stock: 5,
  status: 'ACTIVE',
  store: {
    id: 'store',
    name: 'Tea shop',
    slug: 'tea-shop',
    description: null,
    logoUrl: null,
    status: 'APPROVED',
  },
  category: null,
  images: [],
};
function response(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(
      status === 200
        ? { success: true, data }
        : { success: false, error: { code: 'ERROR', message: 'Error' } },
    ),
    { status },
  );
}
beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  window.location.hash = '';
});

describe('shopping cart UI', () => {
  it('routes to an empty cart and offers shopping navigation', async () => {
    window.location.hash = '#/cart';
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url === '/api/me' ? response({ id: 'u1', name: 'Buyer', email: 'buyer@example.com', phone: null, role: 'BUYER', status: 'ACTIVE' }) : response(empty)),
    );
    render(<App />);
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '#/');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cart',
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );
  });

  it('renders current guest prices, edits quantities and removes items', async () => {
    localStorage.setItem('myanmart.guest-cart', JSON.stringify([{ productId: 'product', quantity: 2 }]));
    fetchMock.mockImplementation(() => Promise.resolve(response(product)));
    render(<CartPage />);
    const quantity = await screen.findByRole('spinbutton', { name: 'Quantity — Tea' });
    expect(screen.getByText('1,500 MMK')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tea shop' })).toHaveAttribute(
      'href',
      '#/stores/tea-shop',
    );
    fireEvent.change(quantity, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update quantity' }));
    await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(3));
    expect(JSON.parse(localStorage.getItem('myanmart.guest-cart') ?? '[]')).toEqual([{ productId: 'product', quantity: 3 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove — Tea' }));
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(localStorage.getItem('myanmart.guest-cart')).toBeNull();
  });

  it('shows unavailable local items', async () => {
    localStorage.setItem('myanmart.guest-cart', JSON.stringify([{ productId: 'missing', quantity: 1 }]));
    fetchMock.mockResolvedValueOnce(response(null, 404));
    render(<CartPage />);
    expect(await screen.findByText('This product is no longer available. Please remove it from your cart.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });

  it('shows current guest stock changes', async () => {
    localStorage.setItem('myanmart.guest-cart', JSON.stringify([{ productId: 'product', quantity: 2 }]));
    fetchMock.mockResolvedValueOnce(response({ ...product, stock: 0 }));
    render(<CartPage />);
    expect(await screen.findByText('Stock has changed. Please check the available quantity and try again.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove — Tea' })).toBeEnabled();
  });

  it('disables edits for unavailable items and supports Burmese messages', async () => {
    localStorage.setItem('myanmart.locale', 'my');
    localStorage.setItem('myanmart.guest-cart', JSON.stringify([{ productId: 'product', quantity: 1 }]));
    fetchMock.mockResolvedValueOnce(response({ ...product, status: 'ARCHIVED' }));
    render(<CartPage />);
    expect(
      await screen.findByText('ဤပစ္စည်းကို မရရှိနိုင်တော့ပါ။ ဈေးခြင်းမှ ဖယ်ရှားပါ။'),
    ).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });

  it('adds a product to a local guest cart and displays success', async () => {
    render(<ProductDetailPage product={product} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(await screen.findByText('Added to cart.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('myanmart.guest-cart') ?? '[]')).toEqual([
      { productId: 'product', quantity: 1 },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prevents out-of-stock guest adds', async () => {
    render(<ProductDetailPage product={{ ...product, stock: 0 }} />);
    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
    expect(localStorage.getItem('myanmart.guest-cart')).toBeNull();
  });

  it('hydrates, edits, and removes a guest cart from current public product data', async () => {
    localStorage.setItem('myanmart.guest-cart', JSON.stringify([{ productId: 'product', quantity: 2 }]));
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/products/product') return Promise.resolve(response(product));
      return Promise.resolve(response(null, 401));
    });
    render(<CartPage />);
    expect(await screen.findByText('Your cart is saved on this device. Sign in at checkout to place your order.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update quantity' }));
    await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(3));
    expect(JSON.parse(localStorage.getItem('myanmart.guest-cart') ?? '[]')).toEqual([{ productId: 'product', quantity: 3 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove — Tea' }));
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(localStorage.getItem('myanmart.guest-cart')).toBeNull();
  });

  it('reports network failures without showing an empty cart', async () => {
    localStorage.setItem('myanmart.guest-cart', JSON.stringify([{ productId: 'product', quantity: 1 }]));
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    render(<CartPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update cart.');
    expect(screen.queryByText('Your cart is empty.')).not.toBeInTheDocument();
  });
});
