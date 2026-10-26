import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatCep, formatDate, money, ORDER_STATUS } from '../../lib/format';
import { EmptyState, ErrorBox, Pagination, Spinner, StatusBadge } from '../../components/ui';

// Próximos passos possíveis (espelha as regras do backend)
const ACTIONS = {
  PENDING_PAYMENT: [
    { status: 'PAID', label: 'Confirmar PIX recebido', style: 'btn-primary' },
    { status: 'CANCELED', label: 'Cancelar', style: 'btn-danger' },
  ],
  PAID: [{ status: 'SHIPPED', label: 'Marcar como enviado', style: 'btn-primary' }],
  SHIPPED: [{ status: 'DELIVERED', label: 'Marcar como entregue', style: 'btn-primary' }],
};

function OrderRow({ order, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function changeStatus(status) {
    if (!confirm(`Alterar pedido #${order.code} para "${ORDER_STATUS[status].label}"?`)) return;
    setBusy(true);
    setError('');
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status });
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card">
      <button
        className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-display text-2xl">#{order.code}</span>
        <StatusBadge status={order.status} />
        <span className="text-sm">{order.user.name}</span>
        <span className="text-sm text-muted">{formatDate(order.createdAt)}</span>
        <span className="ml-auto font-semibold text-amber-glow">{money(order.total)}</span>
        <span className="text-muted">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-peat-700 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="label">Itens</p>
            <ul className="space-y-1">
              {order.items.map((i) => (
                <li key={i.id}>
                  {i.quantity}× {i.productName} <span className="text-muted">({money(i.unitPrice)})</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted">
              Frete: {Number(order.shippingFee) === 0 ? 'grátis' : money(order.shippingFee)}
            </p>
          </div>
          <div>
            <p className="label">Cliente e entrega</p>
            <p>{order.user.name}</p>
            <p className="text-muted">{order.user.email}</p>
            <p className="mt-2 text-muted">
              {order.shipStreet}, {order.shipNumber}
              {order.shipComplement ? ` – ${order.shipComplement}` : ''}
              <br />
              {order.shipNeighborhood} · {order.shipCity}/{order.shipState} · {formatCep(order.shipCep)}
            </p>
          </div>
          <div>
            <p className="label">Pagamento</p>
            <p className="text-muted">
              PIX · {order.payment?.status === 'CONFIRMED' ? `pago em ${formatDate(order.payment.paidAt)}` : order.payment?.status === 'PENDING' ? 'aguardando' : 'expirado'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(ACTIONS[order.status] || []).map((a) => (
                <button
                  key={a.status}
                  className={`btn ${a.style} px-3 py-2`}
                  disabled={busy}
                  onClick={() => changeStatus(a.status)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <ErrorBox>{error}</ErrorBox>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default function AdminOrders() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      api
        .get('/admin/orders', { status, page })
        .then(setData)
        .catch((err) => setError(err.message)),
    [status, page],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl">Pedidos</h1>
        <select
          className="input ml-auto max-w-xs"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          {Object.entries(ORDER_STATUS).map(([value, s]) => (
            <option key={value} value={value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <ErrorBox>{error}</ErrorBox>
      {!data && !error && <Spinner />}
      {data?.items.length === 0 && <EmptyState title="Nenhum pedido">Os pedidos aparecerão aqui.</EmptyState>}

      {data?.items.length > 0 && (
        <ul className="space-y-3">
          {data.items.map((o) => (
            <OrderRow key={o.id} order={o} onChange={load} />
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
