/**
 * Gerador de payload PIX "copia e cola" (BR Code, padrão EMV do Banco Central).
 * Gera um QR Code estático com valor e txid — pode ser lido por qualquer app de banco.
 * Ref.: Manual de Padrões para Iniciação do PIX (BCB).
 */

const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** Remove acentos e caracteres fora do padrão aceito pelo BR Code. */
function sanitize(text, maxLength) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-@_*$%+/:]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, maxLength);
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63. */
export function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * @param {object} p
 * @param {string} p.key        Chave PIX do recebedor (e-mail, CPF/CNPJ, telefone ou aleatória)
 * @param {string} p.name       Nome do recebedor (até 25 caracteres)
 * @param {string} p.city       Cidade do recebedor (até 15 caracteres)
 * @param {number} p.amount     Valor em reais
 * @param {string} p.txid       Identificador da transação (até 25 caracteres alfanuméricos)
 * @param {string} [p.description] Mensagem opcional exibida no app do pagador
 */
export function buildPixPayload({ key, name, city, amount, txid, description }) {
  const account =
    field('00', 'br.gov.bcb.pix') +
    field('01', key.trim()) +
    (description ? field('02', sanitize(description, 40)) : '');

  const cleanTxid = (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  const payload =
    field('00', '01') + // Payload Format Indicator
    field('01', '12') + // QR de uso único
    field('26', account) +
    field('52', '0000') + // Merchant Category Code
    field('53', '986') + // Moeda: BRL
    field('54', Number(amount).toFixed(2)) +
    field('58', 'BR') +
    field('59', sanitize(name, 25)) +
    field('60', sanitize(city, 15)) +
    field('62', field('05', cleanTxid)) +
    '6304';

  return payload + crc16(payload);
}
