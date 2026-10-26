import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { formatCep, formatDate, money } from '../../lib/format';
import { EmptyState, ErrorBox, Spinner, StatusBadge } from '../../components/ui';

function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const ms = Math.max(0, new Date(expiresAt).getTime() - now);
  const min = String(Math.floor(ms / 60000)).padStart(2, '0');
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return { expired: ms === 0, label: `${min}:${sec}` };
}

function PixPayment({ order, onPaid, onCancel }) {
  const { payment } = order;
  const { expired, label } = useCountdown(payment.expiresAt);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function copy() {
    await navigator.clipboard.writeText(payment.pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function run(kind, fn) {
    setBusy(kind);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="card p-6 text-center sm:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-amber-glow">Pague com PIX</p>
      <p className="mt-2 text-4xl font-semibold">{money(payment.amount)}</p>
      <p className={`mt-2 text-sm ${expired ? 'text-danger' : 'text-muted'}`}>
        {expired ? 'Este PIX expirou' : `Expira em ${label}`}
      </p>

      {payment.qrCodeDataUrl && (
        <img
          src={payment.qrCodeDataUrl}
          alt="QR Code PIX"
          className="mx-auto mt-6 w-56 rounded-lg bg-white p-3 sm:w-64"
        />
      )}

      <ol className="mx-auto mt-6 max-w-sm space-y-1 text-left text-sm text-muted">
        <li>1. Abra o app do seu banco e escolha pagar com PIX.</li>
        <li>2. Escaneie o QR Code ou use o código copia e cola.</li>
        <li>3. Confirme o pagamento — esta tela atualiza sozinha.</li>
      </ol>

      <div className="mt-6 flex gap-2">
        <input className="input font-mono text-xs" readOnly value={payment.pixPayload} aria-label="Código PIX" />
        <button className="btn btn-primary shrink-0" onClick={copy}>
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      <div className="mt-4">
        <ErrorBox>{error}</ErrorBox>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-peat-700 pt-6 sm:flex-row sm:justify-center">
        <button
          className="btn btn-primary"
          disabled={Boolean(busy) || expired}
          onClick={() => run('pay', async () => onPaid(await api.post(`/orders/${order.id}/pay/simulate`)))}
        >
          {busy === 'pay' ? 'Confirmando...' : 'Já paguei (simulação)'}
        </button>
        <button
          className="btn btn-danger"
          disabled={Boolean(busy)}
          onClick={() => {
            if (!confirm('Cancelar este pedido?')) return;
            run('cancel', async () => onCancel(await api.post(`/orders/${order.id}/cancel`)));
          }}
        >
          {busy === 'cancel' ? 'Cancelando...' : 'Cancelar pedido'}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Ambiente de demonstração: o botão "Já paguei" simula a confirmação do banco.
      </p>
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api.get(`/orders/${id}`).then(setOrder), [id]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  // Enquanto aguarda o PIX, consulta o pedido a cada 5 s para detectar o pagamento
  const pending = order?.status === 'PENDING_PAYMENT';
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => load().catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [pending, load]);

  if (error) {
    return (
      <EmptyState title="Pedido não encontrado">
        <Link to="/meus-pedidos" className="btn btn-primary mt-4">
          Meus pedidos
        </Link>
      </EmptyState>
    );
  }
  if (!order) return <Spinner />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <Link to="/meus-pedidos" className="text-sm text-muted hover:text-amber-glow">
          ← Meus pedidos
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl">Pedido #{order.code}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-muted">Feito em {formatDate(order.createdAt)}</p>

        {pending && order.payment && (
          <div className="mt-8">
            <PixPayment order={order} onPaid={setOrder} onCancel={setOrder} />
          </div>
        )}

        {order.status === 'PAID' && (
          <div className="card mt-8 border-ok/40 p-6">
            <h2 className="text-2xl text-ok">Pagamento confirmado! 🥃</h2>
            <p className="mt-2 text-sm text-muted">
              Recebemos seu PIX {order.payment?.paidAt && `em ${formatDate(order.payment.paidAt)}`}. Seu pedido
              está sendo preparado para envio.
            </p>
          </div>
        )}
      </div>

      <aside className="card h-fit p-6">
        <h2 className="text-2xl">Itens</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="text-muted">
                {i.quantity}× {i.productName}
              </span>
              <span>{money(Number(i.unitPrice) * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-peat-700 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Frete</span>
            <span>{Number(order.shippingFee) === 0 ? 'Grátis' : money(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between pt-1 text-lg font-semibold">
            <span>Total</span>
            <span className="text-amber-glow">{money(order.total)}</span>
          </div>
        </div>

        <h3 className="mt-6 text-xl">Entrega</h3>
        <p className="mt-2 text-sm text-muted">
          {order.shipStreet}, {order.shipNumber}
          {order.shipComplement ? ` – ${order.shipComplement}` : ''}
          <br />
          {order.shipNeighborhood} · {order.shipCity}/{order.shipState}
          <br />
          CEP {formatCep(order.shipCep)}
        </p>
      </aside>
    </div>
  );
}
