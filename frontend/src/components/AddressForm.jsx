import { useState } from 'react';
import { formatCep } from '../lib/format';
import { ErrorBox } from './ui';

const EMPTY = { label: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

/**
 * Formulário de endereço com preenchimento automático pelo CEP (ViaCEP).
 * onSubmit recebe os dados e deve devolver uma Promise (erros da API aparecem nos campos).
 */
export default function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Salvar endereço' }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial, cep: formatCep(initial?.cep || '') });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function lookupCep(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErrors((e) => ({ ...e, cep: 'CEP não encontrado' }));
        return;
      }
      setErrors((e) => ({ ...e, cep: undefined }));
      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
    } catch {
      // Sem internet/ViaCEP fora do ar: o usuário preenche manualmente
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError('');
    try {
      const payload = { ...form };
      if (!payload.label) payload.label = null;
      if (!payload.complement) payload.complement = null;
      await onSubmit(payload);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!err.details) setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (name, label, props = {}) => (
    <div className={props.wrapperClass}>
      <label className="label" htmlFor={`addr-${name}`}>
        {label}
      </label>
      <input id={`addr-${name}`} className="input" value={form[name]} onChange={set(name)} {...props.input} />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="addr-cep">
          CEP {cepLoading && <span className="normal-case text-amber-glow">· buscando...</span>}
        </label>
        <input
          id="addr-cep"
          className="input"
          inputMode="numeric"
          placeholder="00000-000"
          maxLength={9}
          required
          value={form.cep}
          onChange={(e) => {
            const v = formatCep(e.target.value);
            setForm((f) => ({ ...f, cep: v }));
            lookupCep(v);
          }}
        />
        {errors.cep && <p className="field-error">{errors.cep}</p>}
      </div>
      {field('label', 'Apelido (opcional)', { wrapperClass: 'sm:col-span-4', input: { placeholder: 'Casa, Trabalho...' } })}
      {field('street', 'Rua', { wrapperClass: 'sm:col-span-4', input: { required: true } })}
      {field('number', 'Número', { wrapperClass: 'sm:col-span-2', input: { required: true } })}
      {field('complement', 'Complemento', { wrapperClass: 'sm:col-span-3', input: { placeholder: 'Apto, bloco...' } })}
      {field('neighborhood', 'Bairro', { wrapperClass: 'sm:col-span-3', input: { required: true } })}
      {field('city', 'Cidade', { wrapperClass: 'sm:col-span-4', input: { required: true } })}

      <div className="sm:col-span-2">
        <label className="label" htmlFor="addr-state">
          Estado
        </label>
        <select id="addr-state" className="input" required value={form.state} onChange={set('state')}>
          <option value="">UF</option>
          {UFS.map((uf) => (
            <option key={uf}>{uf}</option>
          ))}
        </select>
        {errors.state && <p className="field-error">{errors.state}</p>}
      </div>

      <div className="sm:col-span-6">
        <ErrorBox>{error}</ErrorBox>
      </div>

      <div className="flex gap-3 sm:col-span-6">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Salvando...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
