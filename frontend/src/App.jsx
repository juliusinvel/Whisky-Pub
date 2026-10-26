import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AgeGate from './components/AgeGate';

import Catalog from './pages/store/Catalog';
import ProductDetail from './pages/store/ProductDetail';
import Cart from './pages/store/Cart';
import Checkout from './pages/store/Checkout';
import OrderPage from './pages/store/OrderPage';
import MyOrders from './pages/store/MyOrders';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminLayout from './pages/admin/AdminLayout';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <>
      <AgeGate />
      <Routes>
        <Route element={<Layout />}>
          {/* Loja (pública) */}
          <Route index element={<Catalog />} />
          <Route path="produto/:id" element={<ProductDetail />} />
          <Route path="carrinho" element={<Cart />} />
          <Route path="login" element={<Login />} />
          <Route path="cadastro" element={<Register />} />

          {/* Cliente logado */}
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="meus-pedidos" element={<MyOrders />} />
            <Route path="pedidos/:id" element={<OrderPage />} />
          </Route>

          {/* Painel administrativo */}
          <Route path="admin" element={<ProtectedRoute role="ADMIN" />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminProducts />} />
              <Route path="produtos/novo" element={<AdminProductForm />} />
              <Route path="produtos/:id" element={<AdminProductForm />} />
              <Route path="pedidos" element={<AdminOrders />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
