import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorBox } from '../../components/ui';

export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const destination = (u) => location.state?.from || (u.role === 'ADMIN' ? '/admin' : '/');

  if (user) return <Navigate to={destination(user)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      navigate(destination(u), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Entrar" subtitle="Bem-vindo de volta ao pub.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
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
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" state={location.state} className="text-amber-glow hover:underline">
          Cadastre-se
        </Link>
      </p>
    </AuthCard>
  );
}
