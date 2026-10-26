import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPixPayload, crc16 } from './pix.js';

test('crc16 bate com o valor de referência CCITT-FALSE', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('payload PIX tem estrutura e CRC válidos', () => {
  const payload = buildPixPayload({
    key: 'loja@whiskypub.com',
    name: 'Whisky Pub Comércio',
    city: 'São Paulo',
    amount: 249.8,
    txid: 'PEDIDO-1001',
  });

  assert.ok(payload.startsWith('000201010212'));
  assert.ok(payload.includes('0014br.gov.bcb.pix0118loja@whiskypub.com'));
  assert.ok(payload.includes('5406249.80'));
  assert.ok(payload.includes('5919WHISKY PUB COMERCIO'));
  assert.ok(payload.includes('6009SAO PAULO'));
  assert.ok(payload.includes('62140510PEDIDO1001'));

  const body = payload.slice(0, -4);
  assert.ok(body.endsWith('6304'));
  assert.equal(payload.slice(-4), crc16(body));
});
