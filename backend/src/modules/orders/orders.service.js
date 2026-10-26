import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { badRequest, conflict, notFound } from '../../lib/http-error.js';
import { buildPixPayload } from '../../utils/pix.js';

// Dinheiro é calculado em centavos (inteiros) para evitar erro de ponto flutuante
const toCents = (decimal) => Math.round(Number(decimal) * 100);
const fromCents = (cents) => (cents / 100).toFixed(2);

const ORDER_INCLUDE = {
  items: { include: { product: { select: { imageUrl: true } } } },
  payment: true,
};

/** Soma quantidades repetidas do mesmo produto: [{A,1},{A,2}] → [{A,3}] */
function mergeItems(items) {
  const map = new Map();
  for (const { productId, quantity } of items) {
    map.set(productId, (map.get(productId) || 0) + quantity);
  }
  return [...map].map(([productId, quantity]) => ({ productId, quantity }));
}

function shippingFor(subtotalCents) {
  if (subtotalCents === 0) return 0;
  return subtotalCents >= toCents(env.FREE_SHIPPING_FROM) ? 0 : toCents(env.SHIPPING_FEE);
}

/**
 * Confere o carrinho com o banco: preços atuais, disponibilidade e totais.
 * Usado pela tela do carrinho antes do checkout.
 */
export async function quoteCart(rawItems) {
  const items = mergeItems(rawItems);
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  const issues = [];
  let subtotal = 0;

  for (const { productId, quantity } of items) {
    const p = byId.get(productId);
    if (!p || !p.isActive) {
      issues.push({ productId, message: 'Produto indisponível' });
      continue;
    }
    if (p.stock < quantity) {
      issues.push({ productId, message: `Só restam ${p.stock} unidade(s) de ${p.name}`, available: p.stock });
    }
    const lineTotal = toCents(p.price) * quantity;
    subtotal += lineTotal;
    lines.push({
      productId,
      name: p.name,
      imageUrl: p.imageUrl,
      unitPrice: fromCents(toCents(p.price)),
      quantity,
      stock: p.stock,
      lineTotal: fromCents(lineTotal),
    });
  }

  const shipping = shippingFor(subtotal);
  return {
    items: lines,
    issues,
    subtotal: fromCents(subtotal),
    shippingFee: fromCents(shipping),
    total: fromCents(subtotal + shipping),
    freeShippingFrom: env.FREE_SHIPPING_FROM.toFixed(2),
  };
}

/** Checkout: reserva o estoque, cria o pedido e gera a cobrança PIX — tudo numa transação. */
export async function createOrder(userId, { items: rawItems, addressId }) {
  const items = mergeItems(rawItems);

  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw badRequest('Endereço de entrega inválido');

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItems = [];

    for (const { productId, quantity } of items) {
      const p = byId.get(productId);
      if (!p) throw badRequest('Um dos produtos do carrinho não está mais disponível', { productId });

      // Baixa condicional: só debita se ainda houver estoque (seguro contra compras simultâneas)
      const { count } = await tx.product.updateMany({
        where: { id: productId, isActive: true, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (count === 0) {
        throw conflict(`Estoque insuficiente para ${p.name}`);
      }

      subtotal += toCents(p.price) * quantity;
      orderItems.push({ productId, productName: p.name, unitPrice: p.price, quantity });
    }

    const shipping = shippingFor(subtotal);
    const total = subtotal + shipping;
    const txid = `WP${crypto.randomBytes(12).toString('hex').toUpperCase()}`.slice(0, 25);

    const created = await tx.order.create({
      data: {
        userId,
        subtotal: fromCents(subtotal),
        shippingFee: fromCents(shipping),
        total: fromCents(total),
        shipCep: address.cep,
        shipStreet: address.street,
        shipNumber: address.number,
        shipComplement: address.complement,
        shipNeighborhood: address.neighborhood,
        shipCity: address.city,
        shipState: address.state,
        items: { create: orderItems },
      },
    });

    await tx.payment.create({
      data: {
        orderId: created.id,
        amount: fromCents(total),
        txid,
        pixPayload: buildPixPayload({
          key: env.PIX_KEY,
          name: env.PIX_MERCHANT_NAME,
          city: env.PIX_MERCHANT_CITY,
          amount: total / 100,
          txid,
          description: `Pedido ${created.code}`,
        }),
        expiresAt: new Date(Date.now() + env.PIX_EXPIRATION_MINUTES * 60_000),
      },
    });

    return created;
  });

  return getOrderForUser(userId, order.id);
}

/** Cancela um pedido pendente e devolve os itens ao estoque. */
async function cancelPending(orderId, paymentStatus) {
  return prisma.$transaction(async (tx) => {
    // updateMany com filtro de status evita cancelar duas vezes (ou cancelar um pedido já pago)
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELED' },
    });
    if (count === 0) return false;

    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.payment.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: paymentStatus },
    });
    return true;
  });
}

/** Expira cobranças PIX vencidas (chamado periodicamente pelo servidor). */
export async function expireStalePayments() {
  const stale = await prisma.payment.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    select: { orderId: true },
  });
  for (const { orderId } of stale) await cancelPending(orderId, 'EXPIRED');
  return stale.length;
}

/** Adiciona a imagem do QR Code (data URL) quando o PIX ainda está pendente. */
async function withQrCode(order) {
  if (order.payment?.status === 'PENDING') {
    order.payment.qrCodeDataUrl = await QRCode.toDataURL(order.payment.pixPayload, { width: 320, margin: 1 });
  }
  return order;
}

async function loadOrder(where) {
  let order = await prisma.order.findFirst({ where, include: ORDER_INCLUDE });
  if (!order) throw notFound('Pedido não encontrado');

  // Expiração "preguiçosa": se venceu e ainda está pendente, cancela agora
  if (order.payment?.status === 'PENDING' && order.payment.expiresAt < new Date()) {
    await cancelPending(order.id, 'EXPIRED');
    order = await prisma.order.findFirst({ where, include: ORDER_INCLUDE });
  }
  return withQrCode(order);
}

export const getOrderForUser = (userId, id) => loadOrder({ id, userId });
export const getOrderForAdmin = (id) =>
  loadOrder({ id }).then(async (order) => ({
    ...order,
    user: await prisma.user.findUnique({
      where: { id: order.userId },
      select: { id: true, name: true, email: true },
    }),
  }));

export function listOrdersForUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true, payment: { select: { status: true, expiresAt: true, paidAt: true } } },
  });
}

export async function listOrdersForAdmin({ status, page, limit }) {
  const where = status ? { status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
        payment: { select: { status: true, paidAt: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) || 1 };
}

export async function cancelOrderByUser(userId, id) {
  const order = await prisma.order.findFirst({ where: { id, userId } });
  if (!order) throw notFound('Pedido não encontrado');
  if (!(await cancelPending(id, 'EXPIRED'))) {
    throw conflict('Só é possível cancelar pedidos aguardando pagamento');
  }
  return getOrderForUser(userId, id);
}

/** Confirma o pagamento PIX (simulação, confirmação manual do admin ou futuro webhook do banco). */
export async function confirmPayment(orderId) {
  const ok = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { orderId, status: 'PENDING', expiresAt: { gt: new Date() } },
      data: { status: 'CONFIRMED', paidAt: new Date() },
    });
    if (count === 0) return false;
    await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });
    return true;
  });
  if (!ok) throw conflict('Pagamento não está pendente ou o PIX expirou');
}

// Fluxo permitido de status pelo painel administrativo
const ADMIN_TRANSITIONS = {
  PENDING_PAYMENT: ['PAID', 'CANCELED'],
  PAID: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELED: [],
};

export async function updateStatusByAdmin(id, nextStatus) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound('Pedido não encontrado');

  if (!ADMIN_TRANSITIONS[order.status].includes(nextStatus)) {
    throw conflict(`Não é possível mudar de ${order.status} para ${nextStatus}`);
  }

  if (nextStatus === 'PAID') await confirmPayment(id);
  else if (nextStatus === 'CANCELED') await cancelPending(id, 'EXPIRED');
  else await prisma.order.update({ where: { id }, data: { status: nextStatus } });

  return getOrderForAdmin(id);
}
