import { NavLink, Outlet } from 'react-router-dom';

const tab = ({ isActive }) =>
  `border-b-2 px-1 pb-3 text-sm transition ${
    isActive ? 'border-amber-glow text-amber-glow' : 'border-transparent text-muted hover:text-cream'
  }`;

export default function AdminLayout() {
  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-glow">Painel administrativo</p>
        <nav className="mt-4 flex gap-6 border-b border-peat-700">
          <NavLink to="/admin" end className={tab}>
            Produtos
          </NavLink>
          <NavLink to="/admin/pedidos" className={tab}>
            Pedidos
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </>
  );
}
