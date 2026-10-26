import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/http-error.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const addressSchema = z.object({
  label: z.string().trim().max(40).optional().nullable(),
  // aceita "01310-100" ou "01310100" e salva só os dígitos
  cep: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 8, 'CEP deve ter 8 dígitos'),
  street: z.string().trim().min(2, 'Rua obrigatória'),
  number: z.string().trim().min(1, 'Número obrigatório').max(10),
  complement: z.string().trim().max(60).optional().nullable(),
  neighborhood: z.string().trim().min(2, 'Bairro obrigatório'),
  city: z.string().trim().min(2, 'Cidade obrigatória'),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => UFS.includes(v), 'UF inválida'),
  isDefault: z.boolean().optional(),
});

const idParam = z.object({ id: z.string().uuid('ID inválido') });

const router = Router();
router.use(authenticate);

async function findOwn(userId, id) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw notFound('Endereço não encontrado');
  return address;
}

/** GET /api/addresses — endereços do usuário logado (padrão primeiro) */
router.get('/', async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  res.json(addresses);
});

/** POST /api/addresses — o primeiro endereço vira o padrão automaticamente */
router.post('/', validate({ body: addressSchema }), async (req, res) => {
  const userId = req.user.id;
  const data = req.valid.body;

  const address = await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    const isDefault = count === 0 || data.isDefault === true;
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, userId, isDefault } });
  });

  res.status(201).json(address);
});

/** PUT /api/addresses/:id */
router.put('/:id', validate({ params: idParam, body: addressSchema.partial() }), async (req, res) => {
  const userId = req.user.id;
  const current = await findOwn(userId, req.valid.params.id);
  const data = req.valid.body;

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault === true) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    if (data.isDefault === false) delete data.isDefault; // sempre precisa existir um padrão
    return tx.address.update({ where: { id: current.id }, data });
  });

  res.json(address);
});

/** DELETE /api/addresses/:id — se apagar o padrão, o mais antigo assume */
router.delete('/:id', validate({ params: idParam }), async (req, res) => {
  const userId = req.user.id;
  const current = await findOwn(userId, req.valid.params.id);

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: current.id } });
    if (current.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });

  res.status(204).end();
});

export default router;
