import { useState } from 'react';

const KEY = 'whiskypub.adult';

/** Confirmação de maioridade na primeira visita (venda de bebida alcoólica). */
export default function AgeGate() {
  const [confirmed, setConfirmed] = useState(() => localStorage.getItem(KEY) === 'yes');
  const [denied, setDenied] = useState(false);

  if (confirmed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-peat-950/95 p-4 backdrop-blur">
      <div className="card max-w-md p-8 text-center" role="dialog" aria-modal="true" aria-labelledby="agegate-title">
        <p className="font-display text-4xl text-amber-glow">Whisky Pub</p>
        <h2 id="agegate-title" className="mt-6 text-2xl">
          Você tem 18 anos ou mais?
        </h2>
        {denied ? (
          <p className="mt-4 text-sm text-muted">
            Desculpe, o acesso é permitido apenas para maiores de 18 anos.
          </p>
        ) : (
          <div className="mt-8 flex justify-center gap-3">
            <button className="btn btn-ghost" onClick={() => setDenied(true)}>
              Não
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                localStorage.setItem(KEY, 'yes');
                setConfirmed(true);
              }}
            >
              Sim, tenho 18+
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
