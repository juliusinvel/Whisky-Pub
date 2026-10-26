import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import ProductCard from '../../components/ProductCard';
import { EmptyState, ErrorBox, Pagination, Spinner } from '../../components/ui';

const SORTS = {
  newest: 'Novidades',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  name: 'Nome (A–Z)',
};

export default function Catalog() {
  // Filtros ficam na URL: dá para compartilhar e o "voltar" do navegador funciona
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const brand = params.get('brand') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [brands, setBrands] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    api.get('/products/brands').then(setBrands).catch(() => {});
  }, []);

  // Busca com atraso de 400 ms enquanto digita
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) update({ search: searchInput.trim() });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setError('');
    api
      .get('/products', { search, brand, sort, page, limit: 12 })
      .then((res) => active && setData(res))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [search, brand, sort, page]);

  return (
    <>
      <section className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-glow">Seleção da casa</p>
        <h1 className="mt-3 text-5xl sm:text-6xl">Do barril para a sua mesa</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Single malts, blends e bourbons escolhidos a dedo, com pagamento via PIX e entrega para todo o Brasil.
        </p>
      </section>

      <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nome, marca ou nota de sabor..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Buscar whisky"
        />
        <select className="input" value={brand} onChange={(e) => update({ brand: e.target.value })} aria-label="Marca">
          <option value="">Todas as marcas</option>
          {brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select className="input" value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Ordenar">
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ErrorBox>{error}</ErrorBox>

      {!data && !error && <Spinner />}

      {data && data.items.length === 0 && (
        <EmptyState title="Nenhum whisky encontrado">Tente outra busca ou remova os filtros.</EmptyState>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </>
  );
}
