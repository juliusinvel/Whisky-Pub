import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { ageLabel, money } from '../../lib/format';
import { BottleImage, EmptyState, QuantityInput, Spinner } from '../../components/ui';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.get(`/products/${id}`).then(setProduct).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <EmptyState title="Whisky não encontrado">
        <Link to="/" className="btn btn-primary mt-4">
          Voltar ao catálogo
        </Link>
      </EmptyState>
    );
  }
  if (!product) return <Spinner />;

  const soldOut = product.stock <= 0;

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="card aspect-square p-10">
        <BottleImage src={product.imageUrl} alt={product.name} />
      </div>

      <div>
        <Link to="/" className="text-sm text-muted hover:text-amber-glow">
          ← Catálogo
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-amber-glow">{product.brand}</p>
        <h1 className="mt-2 text-5xl leading-tight">{product.name}</h1>
        <p className="mt-2 text-muted">{ageLabel(product.ageYears)}</p>

        <p className="mt-6 text-4xl font-semibold text-amber-glow">{money(product.price)}</p>
        <p className="mt-1 text-sm text-muted">
          {soldOut ? 'Esgotado no momento' : `${product.stock} unidade(s) em estoque`}
        </p>

        <p className="mt-8 whitespace-pre-line leading-relaxed text-cream/90">{product.description}</p>

        {!isAdmin && !soldOut && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <QuantityInput value={qty} max={product.stock} onChange={setQty} />
            <button
              className="btn btn-primary flex-1 py-3"
              onClick={() => {
                add(product, qty);
                navigate('/carrinho');
              }}
            >
              Adicionar ao carrinho
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
