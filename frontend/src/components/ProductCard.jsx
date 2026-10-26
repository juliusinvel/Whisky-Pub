import { Link } from 'react-router-dom';
import { ageLabel, money } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { BottleImage } from './ui';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { isAdmin } = useAuth();
  const soldOut = product.stock <= 0;

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:border-amber-glow/50">
      <Link to={`/produto/${product.id}`} className="relative block aspect-[4/5] bg-peat-800/60 p-6">
        <BottleImage src={product.imageUrl} alt={product.name} className="transition group-hover:scale-105" />
        {product.ageYears ? (
          <span className="absolute left-3 top-3 rounded-full bg-peat-950/80 px-2.5 py-1 text-xs text-amber-glow">
            {product.ageYears} anos
          </span>
        ) : null}
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-danger/90 px-2.5 py-1 text-xs text-peat-950">
            Esgotado
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-widest text-muted">{product.brand}</p>
        <Link to={`/produto/${product.id}`}>
          <h3 className="mt-1 text-xl leading-tight hover:text-amber-glow">{product.name}</h3>
        </Link>
        <p className="mt-1 text-xs text-muted">{ageLabel(product.ageYears)}</p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-semibold text-amber-glow">{money(product.price)}</span>
          {!isAdmin && (
            <button
              className="btn btn-primary px-3 py-2"
              disabled={soldOut}
              onClick={() => add(product)}
              aria-label={`Adicionar ${product.name} ao carrinho`}
            >
              {soldOut ? 'Esgotado' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
