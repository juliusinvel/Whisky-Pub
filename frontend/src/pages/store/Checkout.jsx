import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useCart } from '../../contexts/CartContext';
import { formatCep, money } from '../../lib/format';
import AddressForm from '../../components/AddressForm';
import { EmptyState, ErrorBox, Spinner } from '../../components/ui';

export default function Checkout() {
  const { items, clear, syncWithQuote } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState(null);
  const [addressId, setAddressId] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | endereço
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  async function loadAddresses(selectId) {
    const list = await api.get('/addresses');
    setAddresses(list);
    setAddressId(selectId || list.find((a) => a.isDefault)?.id || list[0]?.id || '');
    if (list.length === 0) setEditing('new');
  }

  useEffect(() => {
    loadAddresses().catch((err) => setError(err.message));
  }, []);

  // Confere preços e estoque atuais sempre que o carrinho muda
  const cartKey = items.map((i) => `${i.productId}:${i.quantity}`).join(',');
  useEffect(() => {
    if (items.length === 0) return;
    api
      .post('/orders/quote', { items: items.map(({ productId, quantity }) => ({ productId, quantity })) })
      .then(setQuote)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  async function saveAddress(data) {
    const saved =
      editing === 'new' ? await api.post('/addresses', data) : await api.put(`/addresses/${editing.id}`, data);
    setEditing(null);
    await loadAddresses(saved.id);
  }

  async function placeOrder() {
    setPlacing(true);
    setError('');
    try {
      const order = await api.post('/orders', {
        addressId,
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      });
      clear();
      navigate(`/pedidos/${order.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState title="Nada para finalizar">
        <Link to="/" className="btn btn-primary mt-4">
          Ver catálogo
        </Link>
      </EmptyState>
    );
  }

  const hasIssues = quote?.issues.length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="text-4xl">Checkout</h1>

        <h2 className="mb-4 mt-8 text-2xl">1. Endereço de entrega</h2>
        {!addresses && <Spinner />}

        {addresses && !editing && (
          <div className="space-y-3">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`card flex cursor-pointer gap-4 p-4 transition ${
                  addressId === a.id ? 'border-amber-glow' : 'hover:border-peat-600'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  className="mt-1 accent-amber-glow"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    {a.label || 'Endereço'} {a.isDefault && <span className="text-xs text-amber-glow">· padrão</span>}
                  </p>
                  <p className="text-muted">
                    {a.street}, {a.number}
                    {a.complement ? ` – ${a.complement}` : ''} · {a.neighborhood}
                  </p>
                  <p className="text-muted">
                    {a.city}/{a.state} · CEP {formatCep(a.cep)}
                  </p>
                </div>
                <button
                  type="button"
                  className="self-start text-xs text-muted hover:text-amber-glow"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditing(a);
                  }}
                >
                  Editar
                </button>
              </label>
            ))}
            <button className="btn btn-ghost" onClick={() => setEditing('new')}>
              + Novo endereço
            </button>
          </div>
        )}

        {editing && (
          <div className="card p-5">
            <AddressForm
              initial={editing === 'new' ? undefined : editing}
              onSubmit={saveAddress}
              onCancel={addresses?.length ? () => setEditing(null) : undefined}
            />
          </div>
        )}

        <h2 className="mb-4 mt-10 text-2xl">2. Pagamento</h2>
        <div className="card flex items-center gap-4 p-4 text-sm">
          <span className="rounded-md bg-ok/15 px-3 py-1.5 font-bold text-ok">PIX</span>
          <p className="text-muted">
            Ao confirmar, geramos o QR Code e o código copia e cola. O pedido fica reservado por 30 minutos.
          </p>
        </div>
      </section>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-2xl">Seu pedido</h2>
        {!quote ? (
          <Spinner label="Calculando..." />
        ) : (
          <>
            <ul className="mt-4 space-y-2 text-sm">
              {quote.items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-3">
                  <span className="text-muted">
                    {i.quantity}× {i.name}
                  </span>
                  <span>{money(i.lineTotal)}</span>
                </li>
              ))}
            </ul>

            {hasIssues && (
              <div className="mt-4 space-y-2">
                {quote.issues.map((issue) => (
                  <ErrorBox key={issue.productId}>{issue.message}</ErrorBox>
                ))}
                <button className="btn btn-ghost w-full" onClick={() => syncWithQuote(quote)}>
                  Ajustar carrinho
                </button>
              </div>
            )}

            <div className="mt-5 space-y-2 border-t border-peat-700 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{money(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Frete</span>
                <span>{Number(quote.shippingFee) === 0 ? 'Grátis' : money(quote.shippingFee)}</span>
              </div>
              {Number(quote.shippingFee) > 0 && (
                <p className="text-xs text-muted">Frete grátis acima de {money(quote.freeShippingFrom)}</p>
              )}
              <div className="flex justify-between pt-2 text-lg font-semibold">
                <span>Total</span>
                <span className="text-amber-glow">{money(quote.total)}</span>
              </div>
            </div>
          </>
        )}

        <div className="mt-4">
          <ErrorBox>{error}</ErrorBox>
        </div>

        <button
          className="btn btn-primary mt-4 w-full py-3"
          disabled={!quote || hasIssues || !addressId || Boolean(editing) || placing}
          onClick={placeOrder}
        >
          {placing ? 'Gerando PIX...' : 'Confirmar e pagar com PIX'}
        </button>
      </aside>
    </div>
  );
}
