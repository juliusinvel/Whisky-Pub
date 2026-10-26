import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { expireStalePayments } from './modules/orders/orders.service.js';

const server = app.listen(env.PORT, () => {
  console.log(`🥃 Whisky Pub API rodando em http://localhost:${env.PORT}`);
});

// A cada minuto, cancela pedidos cujo PIX venceu e devolve os itens ao estoque
const sweeper = setInterval(async () => {
  try {
    const n = await expireStalePayments();
    if (n > 0) console.log(`⏱  ${n} pedido(s) com PIX expirado foram cancelados`);
  } catch (err) {
    console.error('Falha ao expirar pagamentos:', err.message);
  }
}, 60_000);

async function shutdown() {
  clearInterval(sweeper);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
