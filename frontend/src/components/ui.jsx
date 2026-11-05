import BottleArt from './BottleArt';
import { ORDER_STATUS } from '../lib/format';

export function Spinner({ label = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-peat-600 border-t-amber-glow" />
      {label}
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
      {children}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="card px-6 py-16 text-center">
      <h2 className="text-3xl">{title}</h2>
      <div className="mt-3 text-muted">{children}</div>
    </div>
  );
}

const TONES = {
  amber: 'border-amber-glow/40 bg-amber-glow/10 text-amber-glow',
  green: 'border-ok/40 bg-ok/10 text-ok',
  blue: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  red: 'border-danger/40 bg-danger/10 text-danger',
};

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'amber' };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[s.tone]}`}>
      {s.label}
    </span>
  );
}

/** Foto da garrafa; sem foto, mostra uma ilustração gerada a partir do produto */
export function BottleImage({ src, alt, product, className = '' }) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-contain ${className}`} />;
  }
  return <BottleArt product={product || { name: alt }} className={className} />;
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Paginação">
      <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span className="text-sm text-muted">
        Página {page} de {totalPages}
      </span>
      <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Próxima →
      </button>
    </nav>
  );
}

export function QuantityInput({ value, max, onChange }) {
  return (
    <div className="inline-flex items-center rounded-md border border-peat-600">
      <button
        type="button"
        className="px-3 py-1.5 text-lg text-muted hover:text-amber-glow disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span className="w-8 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        className="px-3 py-1.5 text-lg text-muted hover:text-amber-glow disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
}
