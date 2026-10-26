import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { formatDate, money } from '../../lib/format';
import { EmptyState, ErrorBox, Spinner, StatusBadge } from '../../components/ui';

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/orders').then(setOrders).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!orders) return <Spinner />;

  if (orders.length === 0) {
    return (
      <EmptyState title="Você ainda não fez pedidos">
        <Link to="/" className="btn btn-primary mt-4">
          Ver catálogo
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-4xl">Meus pedidos</h1>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/pedidos/${o.id}`}
              className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 transition hover:border-amber-glow/50"
            >
              <span className="font-display text-2xl">#{o.code}</span>
              <StatusBadge status={o.status} />
              <span className="text-sm text-muted">{formatDate(o.createdAt)}</span>
              <span className="text-sm text-muted">
                {o.items.reduce((n, i) => n + i.quantity, 0)} item(ns)
              </span>
              <span className="ml-auto font-semibold text-amber-glow">{money(o.total)}</span>
              {o.status === 'PENDING_PAYMENT' && (
                <span className="w-full text-xs text-amber-glow sm:w-auto">Pagar agora →</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
