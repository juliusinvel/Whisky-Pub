import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const navClass = ({ isActive }) =>
  `text-sm transition hover:text-amber-glow ${isActive ? 'text-amber-glow' : 'text-muted'}`;

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-peat-700 bg-peat-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-wider text-amber-glow sm:text-3xl">
              Whisky Pub
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-4 sm:gap-6">
            <NavLink to="/" end className={navClass}>
              Catálogo
            </NavLink>
            {user && !isAdmin && (
              <NavLink to="/meus-pedidos" className={navClass}>
                Pedidos
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            )}

            {user ? (
              <button
                className="text-sm text-muted hover:text-amber-glow"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title={user.email}
              >
                Sair
              </button>
            ) : (
              <NavLink to="/login" className={navClass}>
                Entrar
              </NavLink>
            )}

            {!isAdmin && (
              <Link to="/carrinho" className="btn btn-ghost px-3 py-2" aria-label={`Carrinho com ${count} itens`}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
                  <circle cx="10" cy="20" r="1.3" />
                  <circle cx="17" cy="20" r="1.3" />
                </svg>
                <span className="tabular-nums">{count}</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-peat-700 py-8 text-center text-xs text-muted">
        <p>Venda proibida para menores de 18 anos. Beba com moderação.</p>
        <p className="mt-1">© {new Date().getFullYear()} Whisky Pub</p>
      </footer>
    </div>
  );
}
