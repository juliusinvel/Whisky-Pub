import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/http-error.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { uploadImage, UPLOAD_DIR } from '../../middlewares/upload.js';
import {
  createProductSchema,
  idParamSchema,
  listQuerySchema,
  updateProductSchema,
} from './products.schemas.js';

const ORDER_BY = {
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  name: { name: 'asc' },
};

function buildWhere(q, { onlyActive }) {
  return {
    ...(onlyActive && { isActive: true }),
    ...(q.brand && { brand: { equals: q.brand, mode: 'insensitive' } }),
    ...(q.minAge !== undefined && { ageYears: { gte: q.minAge } }),
    ...(q.maxPrice !== undefined && { price: { lte: q.maxPrice } }),
    ...(q.search && {
      OR: [
        { name: { contains: q.search, mode: 'insensitive' } },
        { brand: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
      ],
    }),
  };
}

async function paginate(q, where) {
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: ORDER_BY[q.sort],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page: q.page, totalPages: Math.ceil(total / q.limit) || 1 };
}

/** Apaga do disco uma imagem enviada para /uploads (ignora URLs externas). */
async function removeLocalImage(imageUrl) {
  if (!imageUrl?.startsWith('/uploads/')) return;
  await fs.rm(path.join(UPLOAD_DIR, path.basename(imageUrl)), { force: true });
}

// ───────────────────────── Catálogo público ─────────────────────────
export const catalogRouter = Router();

/** GET /api/products — lista de whiskys ativos (filtros, ordenação e paginação) */
catalogRouter.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  const q = req.valid.query;
  res.json(await paginate(q, buildWhere(q, { onlyActive: true })));
});

/** GET /api/products/brands — marcas disponíveis (para o filtro do catálogo) */
catalogRouter.get('/brands', async (_req, res) => {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    distinct: ['brand'],
    select: { brand: true },
    orderBy: { brand: 'asc' },
  });
  res.json(rows.map((r) => r.brand));
});

/** GET /api/products/:id */
catalogRouter.get('/:id', validate({ params: idParamSchema }), async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.valid.params.id, isActive: true },
  });
  if (!product) throw notFound('Whisky não encontrado');
  res.json(product);
});

// ───────────────────────── Admin (CRUD) ─────────────────────────
export const adminProductsRouter = Router();
adminProductsRouter.use(authenticate, authorize('ADMIN'));

/** GET /api/admin/products — inclui inativos */
adminProductsRouter.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  const q = req.valid.query;
  res.json(await paginate(q, buildWhere(q, { onlyActive: false })));
});

/** GET /api/admin/products/:id */
adminProductsRouter.get('/:id', validate({ params: idParamSchema }), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.valid.params.id } });
  if (!product) throw notFound('Whisky não encontrado');
  res.json(product);
});

/** POST /api/admin/products — multipart/form-data (campo "image" opcional) ou JSON */
adminProductsRouter.post('/', uploadImage, async (req, res) => {
  try {
    const data = createProductSchema.parse(req.body ?? {});
    if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (err) {
    if (req.file) await removeLocalImage(`/uploads/${req.file.filename}`);
    throw err;
  }
});

/** PUT /api/admin/products/:id — atualização parcial; nova imagem substitui a antiga */
adminProductsRouter.put('/:id', uploadImage, validate({ params: idParamSchema }), async (req, res) => {
  const newImage = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const current = await prisma.product.findUnique({ where: { id: req.valid.params.id } });
    if (!current) throw notFound('Whisky não encontrado');

    const data = updateProductSchema.parse(req.body ?? {});
    if (newImage) data.imageUrl = newImage;

    const product = await prisma.product.update({ where: { id: current.id }, data });
    if (data.imageUrl !== undefined && data.imageUrl !== current.imageUrl) {
      await removeLocalImage(current.imageUrl);
    }
    res.json(product);
  } catch (err) {
    if (newImage) await removeLocalImage(newImage);
    throw err;
  }
});

/**
 * DELETE /api/admin/products/:id
 * Se o whisky já aparece em pedidos, ele é apenas desativado (some do catálogo,
 * mas o histórico de vendas continua íntegro). Caso contrário, é apagado de vez.
 */
adminProductsRouter.delete('/:id', validate({ params: idParamSchema }), async (req, res) => {
  const { id } = req.valid.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) throw notFound('Whisky não encontrado');

  if (product._count.orderItems > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return res.json({ deleted: false, deactivated: true, message: 'Whisky possui vendas e foi desativado' });
  }

  await prisma.product.delete({ where: { id } });
  await removeLocalImage(product.imageUrl);
  res.json({ deleted: true, deactivated: false });
});
