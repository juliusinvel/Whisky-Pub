import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { money } from '../../lib/format';
import { BottleImage, EmptyState, ErrorBox, Pagination, Spinner } from '../../components/ui';

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(
    () =>
      api
        .get('/admin/products', { search, page, limit: 20, sort: 'name' })
        .then(setData)
        .catch((err) => setError(err.message)),
    [search, page],
  );

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete(product) {
    if (!confirm(`Remover "${product.name}" do catálogo?`)) return;
    setError('');
    try {
      const res = await api.delete(`/admin/products/${product.id}`);
      setNotice(res.deactivated ? `"${product.name}" já tem vendas e foi desativado.` : `"${product.name}" foi removido.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(product) {
    setError('');
    try {
      await api.put(`/admin/products/${product.id}`, { isActive: !product.isActive });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl">Catálogo</h1>
        <input
          type="search"
          className="input ml-auto max-w-xs"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Buscar produto"
        />
        <Link to="/admin/produtos/novo" className="btn btn-primary">
          + Novo whisky
        </Link>
      </div>

      <div className="mb-4 space-y-2">
        <ErrorBox>{error}</ErrorBox>
        {notice && (
          <p className="rounded-md border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok" role="status">
            {notice}
          </p>
        )}
      </div>

      {!data && <Spinner />}
      {data?.items.length === 0 && <EmptyState title="Nenhum produto">Cadastre o primeiro whisky.</EmptyState>}

      {data?.items.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-peat-700 text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3">Whisky</th>
                <th className="p-3">Idade</th>
                <th className="p-3 text-right">Preço</th>
                <th className="p-3 text-right">Estoque</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b border-peat-800 last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 rounded bg-peat-800 p-1">
                        <BottleImage src={p.imageUrl} alt="" />
                      </div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted">{p.ageYears ? `${p.ageYears} anos` : '—'}</td>
                  <td className="p-3 text-right tabular-nums">{money(p.price)}</td>
                  <td className={`p-3 text-right tabular-nums ${p.stock <= 3 ? 'text-danger' : ''}`}>{p.stock}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${
                        p.isActive ? 'border-ok/40 text-ok' : 'border-peat-600 text-muted'
                      }`}
                      title="Clique para alternar"
                    >
                      {p.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-3">
                      <Link to={`/admin/produtos/${p.id}`} className="text-amber-glow hover:underline">
                        Editar
                      </Link>
                      <button className="text-muted hover:text-danger" onClick={() => handleDelete(p)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
