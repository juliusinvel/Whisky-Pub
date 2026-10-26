import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { money } from '../../lib/format';
import { BottleImage, EmptyState, QuantityInput } from '../../components/ui';

export default function Cart() {
  const { items, subtotal, setQuantity, remove } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState title="Seu carrinho está vazio">
        <p>Que tal escolher uma garrafa?</p>
        <Link to="/" className="btn btn-primary mt-6">
          Ver catálogo
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section>
        <h1 className="mb-6 text-4xl">Carrinho</h1>
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.productId} className="card flex gap-4 p-4">
              <Link to={`/produto/${item.productId}`} className="h-24 w-20 shrink-0 rounded-md bg-peat-800 p-2">
                <BottleImage src={item.imageUrl} alt={item.name} />
              </Link>
              <div className="flex flex-1 flex-col">
                <p className="text-xs uppercase tracking-widest text-muted">{item.brand}</p>
                <p className="font-display text-xl">{item.name}</p>
                <p className="text-sm text-muted">{money(item.price)} cada</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                  <QuantityInput
                    value={item.quantity}
                    max={item.stock}
                    onChange={(q) => setQuantity(item.productId, q)}
                  />
                  <button className="text-sm text-muted hover:text-danger" onClick={() => remove(item.productId)}>
                    Remover
                  </button>
                </div>
              </div>
              <p className="font-semibold text-amber-glow">{money(Number(item.price) * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </section>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-2xl">Resumo</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">Frete e total final são calculados no checkout.</p>
        <button
          className="btn btn-primary mt-6 w-full py-3"
          onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
        >
          {user ? 'Finalizar compra' : 'Entrar para finalizar'}
        </button>
        <Link to="/" className="mt-3 block text-center text-sm text-muted hover:text-amber-glow">
          Continuar comprando
        </Link>
      </aside>
    </div>
  );
}
