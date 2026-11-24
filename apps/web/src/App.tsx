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
import { AuthPage } from './pages/AuthPage';
import { SellerApplicationPage } from './pages/SellerApplicationPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthProvider } from './contexts/auth-context';
import { RequireAuth } from './components/RequireAuth';

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
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/products/:id" element={<ProductRoute />} />
          <Route path="/stores/:slug" element={<StoreRoute />} />
          <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
          <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderRoute /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="/seller/apply" element={<RequireAuth><SellerApplicationPage /></RequireAuth>} />
          <Route path="/seller/products" element={<RequireAuth><SellerProductsPage /></RequireAuth>} />
          <Route path="/seller/orders" element={<RequireAuth><SellerOrdersPage /></RequireAuth>} />
          <Route path="/payments/:role" element={<RequireAuth><PaymentReviewRoute /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
          <Route path="*" element={<CatalogPage />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
