import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { HttpError } from '../lib/http-error.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Imagem maior que 5 MB' : err.message;
    return res.status(400).json({ error: msg });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Registro duplicado' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Recurso não encontrado' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}
