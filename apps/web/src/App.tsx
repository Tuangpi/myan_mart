import { HashRouter, Route, Routes, useParams } from 'react-router-dom';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { SellerProductsPage } from './pages/SellerProductsPage';
import { StorefrontPage } from './pages/StorefrontPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentReviewPage } from './pages/PaymentReviewPage';
import { AdminPage } from './pages/AdminPage';
import { SellerOrdersPage } from './pages/SellerOrdersPage';

function ProductRoute() {
  const { id = '' } = useParams();
  return <ProductDetailPage id={id} />;
}

function StoreRoute() {
  const { slug = '' } = useParams();
  return <StorefrontPage slug={slug} />;
}

function OrderRoute() {
  const { id = '' } = useParams();
  return <OrdersPage id={id} />;
}

function PaymentReviewRoute() {
  const { role } = useParams();
  return role === 'admin' || role === 'seller' ? (
    <PaymentReviewPage role={role} />
  ) : (
    <CatalogPage />
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:id" element={<ProductRoute />} />
        <Route path="/stores/:slug" element={<StoreRoute />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderRoute />} />
        <Route path="/seller/products" element={<SellerProductsPage />} />
        <Route path="/seller/orders" element={<SellerOrdersPage />} />
        <Route path="/payments/:role" element={<PaymentReviewRoute />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<CatalogPage />} />
      </Routes>
    </HashRouter>
  );
}
