import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { BottleImage, ErrorBox, Spinner } from '../../components/ui';

const EMPTY = { name: '', brand: '', ageYears: '', description: '', price: '', stock: '', isActive: true };

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [currentImage, setCurrentImage] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/admin/products/${id}`)
      .then((p) => {
        setForm({
          name: p.name,
          brand: p.brand,
          ageYears: p.ageYears ?? '',
          description: p.description,
          price: p.price,
          stock: p.stock,
          isActive: p.isActive,
        });
        setCurrentImage(p.imageUrl);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Libera a URL temporária da prévia ao trocar de arquivo
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError('');

    // multipart/form-data para enviar a imagem junto com os campos
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, String(v)));
    if (file) body.append('image', file);

    try {
      if (isEdit) await api.put(`/admin/products/${id}`, body);
      else await api.post('/admin/products', body);
      navigate('/admin');
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!err.details) setError(err.message);
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  const input = (name, label, props = {}) => (
    <div className={props.wrapperClass}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} className="input" value={form[name]} onChange={set(name)} {...props.input} />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <>
      <Link to="/admin" className="text-sm text-muted hover:text-amber-glow">
        ← Voltar
      </Link>
      <h1 className="mb-8 mt-4 text-4xl">{isEdit ? 'Editar whisky' : 'Novo whisky'}</h1>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="card grid gap-5 p-6 sm:grid-cols-6">
          {input('name', 'Nome', { wrapperClass: 'sm:col-span-4', input: { required: true } })}
          {input('brand', 'Marca', { wrapperClass: 'sm:col-span-2', input: { required: true } })}
          {input('ageYears', 'Idade (anos)', {
            wrapperClass: 'sm:col-span-2',
            input: { type: 'number', min: 0, max: 100, placeholder: 'Vazio = sem idade' },
          })}
          {input('price', 'Preço (R$)', {
            wrapperClass: 'sm:col-span-2',
            input: { type: 'number', min: 0.01, step: 0.01, required: true },
          })}
          {input('stock', 'Estoque', {
            wrapperClass: 'sm:col-span-2',
            input: { type: 'number', min: 0, step: 1, required: true },
          })}

          <div className="sm:col-span-6">
            <label className="label" htmlFor="description">
              Descrição
            </label>
            <textarea
              id="description"
              className="input min-h-36"
              required
              value={form.description}
              onChange={set('description')}
              placeholder="Notas de prova, região, tipo de barril..."
            />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>

          <label className="flex items-center gap-3 text-sm sm:col-span-6">
            <input type="checkbox" className="accent-amber-glow" checked={form.isActive} onChange={set('isActive')} />
            Visível no catálogo
          </label>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <p className="label">Imagem</p>
            <div className="aspect-[4/5] rounded-md bg-peat-800 p-4">
              <BottleImage src={preview || currentImage} alt="Prévia" />
            </div>
            <label className="btn btn-ghost mt-4 w-full cursor-pointer">
              {file || currentImage ? 'Trocar imagem' : 'Escolher imagem'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <p className="mt-2 text-xs text-muted">JPG, PNG ou WEBP até 5 MB.</p>
          </div>

          <ErrorBox>{error}</ErrorBox>
          <button type="submit" className="btn btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar whisky'}
          </button>
        </div>
      </form>
    </>
  );
}
