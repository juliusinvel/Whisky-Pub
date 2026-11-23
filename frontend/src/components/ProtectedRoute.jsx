import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './ui';

/** Bloqueia a rota para quem não está logado (ou não tem o nível de acesso exigido). */
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  // Área do admin manda para o login do painel; o resto, para o login da loja
  const loginPath = role === 'ADMIN' ? '/admin/login' : '/login';
  if (!user) return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) {
    return role === 'ADMIN' ? <Navigate to="/admin/login" replace state={{ from: location.pathname }} /> : <Navigate to="/" replace />;
  }
  return <Outlet />;
}
