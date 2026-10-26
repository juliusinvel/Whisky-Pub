import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa ter pelo menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SHIPPING_FEE: z.coerce.number().nonnegative().default(29.9),
  FREE_SHIPPING_FROM: z.coerce.number().nonnegative().default(500),
  PIX_KEY: z.string().min(1, 'PIX_KEY é obrigatório'),
  PIX_MERCHANT_NAME: z.string().default('WHISKY PUB'),
  PIX_MERCHANT_CITY: z.string().default('SAO PAULO'),
  PIX_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(30),
  PIX_SIMULATION: bool,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
