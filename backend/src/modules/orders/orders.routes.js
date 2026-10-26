import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { forbidden } from '../../lib/http-error.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as orders from './orders.service.js';

const cartItems = z
  .array(
    z.object({
      productId: z.string().uuid('Produto inválido'),
      quantity: z.number().int().min(1).max(50),
    }),
  )
  .min(1, 'Carrinho vazio')
  .max(50);

const idParam = z.object({ id: z.string().uuid('ID inválido') });

// ───────────────────────── Cliente ─────────────────────────
export const ordersRouter = Router();
ordersRouter.use(authenticate);

/** POST /api/orders/quote — confere o carrinho (preços atuais, estoque, frete, total) */
ordersRouter.post('/quote', validate({ body: z.object({ items: cartItems }) }), async (req, res) => {
  res.json(await orders.quoteCart(req.valid.body.items));
});

/** POST /api/orders — checkout: cria o pedido e devolve o PIX (copia e cola + QR Code) */
ordersRouter.post(
  '/',
  validate({ body: z.object({ items: cartItems, addressId: z.string().uuid('Endereço inválido') }) }),
  async (req, res) => {
    res.status(201).json(await orders.createOrder(req.user.id, req.valid.body));
  },
);

/** GET /api/orders — meus pedidos */
ordersRouter.get('/', async (req, res) => {
  res.json(await orders.listOrdersForUser(req.user.id));
});

/** GET /api/orders/:id — detalhe (a tela de pagamento consulta aqui para ver se o PIX caiu) */
ordersRouter.get('/:id', validate({ params: idParam }), async (req, res) => {
  res.json(await orders.getOrderForUser(req.user.id, req.valid.params.id));
});

/** POST /api/orders/:id/cancel — cancela um pedido ainda não pago */
ordersRouter.post('/:id/cancel', validate({ params: idParam }), async (req, res) => {
  res.json(await orders.cancelOrderByUser(req.user.id, req.valid.params.id));
});

/**
 * POST /api/orders/:id/pay/simulate — SIMULAÇÃO de pagamento PIX.
 * Só funciona com PIX_SIMULATION=true. Em produção, quem confirma é o webhook do PSP/banco.
 */
ordersRouter.post('/:id/pay/simulate', validate({ params: idParam }), async (req, res) => {
  if (!env.PIX_SIMULATION) throw forbidden('Simulação de pagamento desativada');
  const order = await orders.getOrderForUser(req.user.id, req.valid.params.id); // garante que é do usuário
  await orders.confirmPayment(order.id);
  res.json(await orders.getOrderForUser(req.user.id, order.id));
});

// ───────────────────────── Admin ─────────────────────────
export const adminOrdersRouter = Router();
adminOrdersRouter.use(authenticate, authorize('ADMIN'));

const STATUS = ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED'];

/** GET /api/admin/orders?status=PAID&page=1 */
adminOrdersRouter.get(
  '/',
  validate({
    query: z.object({
      status: z.enum(STATUS).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  }),
  async (req, res) => {
    res.json(await orders.listOrdersForAdmin(req.valid.query));
  },
);

/** GET /api/admin/orders/:id */
adminOrdersRouter.get('/:id', validate({ params: idParam }), async (req, res) => {
  res.json(await orders.getOrderForAdmin(req.valid.params.id));
});

/** PATCH /api/admin/orders/:id/status — { "status": "SHIPPED" } */
adminOrdersRouter.patch(
  '/:id/status',
  validate({ params: idParam, body: z.object({ status: z.enum(STATUS) }) }),
  async (req, res) => {
    res.json(await orders.updateStatusByAdmin(req.valid.params.id, req.valid.body.status));
  },
);
