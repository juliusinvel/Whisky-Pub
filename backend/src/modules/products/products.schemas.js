import { z } from 'zod';

// Formulários multipart chegam como texto: "" vira null/undefined e números são convertidos
const emptyToNull = (v) => (v === '' || v === 'null' ? null : v);

const base = {
  name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  brand: z.string().trim().min(1, 'Marca obrigatória').max(80),
  ageYears: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(100).nullable(), // null = sem idade declarada
  ),
  description: z.string().trim().min(10, 'Descrição muito curta').max(2000),
  price: z.coerce.number().positive('Preço deve ser maior que zero').max(1_000_000),
  stock: z.coerce.number().int().min(0, 'Estoque não pode ser negativo'),
  // URL externa opcional (quando não for enviado arquivo)
  imageUrl: z.preprocess(emptyToNull, z.string().url('URL de imagem inválida').nullable().optional()),
  isActive: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional(),
  ),
};

export const createProductSchema = z.object({
  ...base,
  ageYears: base.ageYears.optional().default(null),
});

export const updateProductSchema = z.object(base).partial();

export const idParamSchema = z.object({ id: z.string().uuid('ID inválido') });

export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  minAge: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});
