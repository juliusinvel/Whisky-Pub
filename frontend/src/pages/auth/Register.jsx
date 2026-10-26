import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorBox } from '../../components/ui';
import { AuthCard } from './Login';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', isAdult: false });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setError('');
    if (form.password !== form.confirm) {
      setErrors({ confirm: 'As senhas não conferem' });
      return;
    }
    setBusy(true);
    try {
      const { name, email, password, isAdult } = form;
      await register({ name, email, password, isAdult });
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!err.details) setError(err.message);
      setBusy(false);
    }
  }

  const input = (name, label, props) => (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} className="input" required value={form[name]} onChange={set(name)} {...props} />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <AuthCard title="Criar conta" subtitle="Cadastre-se para comprar e acompanhar seus pedidos.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {input('name', 'Nome', { autoComplete: 'name' })}
        {input('email', 'E-mail', { type: 'email', autoComplete: 'email' })}
        {input('password', 'Senha (mín. 8 caracteres)', { type: 'password', minLength: 8, autoComplete: 'new-password' })}
        {input('confirm', 'Confirme a senha', { type: 'password', autoComplete: 'new-password' })}

        <label className="flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            className="mt-0.5 accent-amber-glow"
            required
            checked={form.isAdult}
            onChange={set('isAdult')}
          />
          Declaro que tenho 18 anos ou mais.
        </label>
        {errors.isAdult && <p className="field-error">{errors.isAdult}</p>}

        <ErrorBox>{error}</ErrorBox>
        <button type="submit" className="btn btn-primary w-full py-3" disabled={busy}>
          {busy ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{' '}
        <Link to="/login" state={location.state} className="text-amber-glow hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
