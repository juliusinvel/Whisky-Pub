const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** A API devolve valores decimais como texto ("219.90"). */
export const money = (value) => brl.format(Number(value || 0));

export const formatCep = (cep = '') => cep.replace(/\D/g, '').replace(/^(\d{5})(\d{1,3})/, '$1-$2');

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const ageLabel = (years) => (years ? `${years} anos` : 'Sem idade declarada');

export const ORDER_STATUS = {
  PENDING_PAYMENT: { label: 'Aguardando pagamento', tone: 'amber' },
  PAID: { label: 'Pago', tone: 'green' },
  SHIPPED: { label: 'Enviado', tone: 'blue' },
  DELIVERED: { label: 'Entregue', tone: 'green' },
  CANCELED: { label: 'Cancelado', tone: 'red' },
};
