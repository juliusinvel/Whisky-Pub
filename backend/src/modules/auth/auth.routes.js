import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound, unauthorized } from '../../lib/http-error.js';
import { authenticate, signToken } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

// Freia tentativas de força bruta no login/cadastro
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
  // Venda de bebida alcoólica: confirmação de maioridade
  isAdult: z.literal(true, { errorMap: () => ({ message: 'É preciso ter 18 anos ou mais' }) }),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

const publicUser = ({ id, name, email, role, createdAt }) => ({ id, name, email, role, createdAt });

/** POST /api/auth/register — cadastro de cliente (sempre CUSTOMER) */
router.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const { name, email, password } = req.valid.body;

  if (await prisma.user.findUnique({ where: { email } })) {
    throw conflict('Este e-mail já está cadastrado');
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: 'CUSTOMER' },
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

/** POST /api/auth/login */
router.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await prisma.user.findUnique({ where: { email } });

  // Mesma mensagem para e-mail inexistente e senha errada (não revela quem tem conta)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('E-mail ou senha incorretos');
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

/** GET /api/auth/me — dados do usuário logado */
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw notFound('Usuário não encontrado');
  res.json(publicUser(user));
});

export default router;
