import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorBox } from '../../components/ui';

/**
 * Login do painel administrativo, em endereço próprio (/admin/login).
 * A loja não mostra nenhum link para cá: o admin acessa pelo endereço direto.
 * A proteção de verdade continua no backend (rotas /api/admin exigem perfil ADMIN).
 */
export default function AdminLogin() {
  const { user, isAdmin, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.startsWith('/admin') ? location.state.from : '/admin';

  if (isAdmin) return <Navigate to={from} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      if (u.role !== 'ADMIN') {
        logout();
        setError('Esta conta não tem acesso ao painel administrativo.');
        setBusy(false);
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-3xl font-bold tracking-wider text-amber-glow">Whisky Pub</p>
        <p className="mt-1 text-center text-xs uppercase tracking-[0.3em] text-muted">Painel administrativo</p>

        <div className="card mt-8 p-8">
          <h1 className="text-3xl">Acesso restrito</h1>
          {user && !isAdmin && (
            <p className="mt-2 text-sm text-muted">
              Você está logado como cliente ({user.email}). Entre com uma conta de administrador.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="admin-email">
                E-mail
              </label>
              <input
                id="admin-email"
                type="email"
                className="input"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-password">
                Senha
              </label>
              <input
                id="admin-password"
                type="password"
                className="input"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <ErrorBox>{error}</ErrorBox>
            <button type="submit" className="btn btn-primary w-full py-3" disabled={busy}>
              {busy ? 'Entrando...' : 'Entrar no painel'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted hover:text-amber-glow">
            ← Ir para a loja
          </Link>
        </p>
      </div>
    </div>
  );
}
