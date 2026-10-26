import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { UPLOAD_DIR } from './middlewares/upload.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import addressRoutes from './modules/addresses/addresses.routes.js';
import { catalogRouter, adminProductsRouter } from './modules/products/products.routes.js';
import { ordersRouter, adminOrdersRouter } from './modules/orders/orders.routes.js';

export const app = express();

app.use(
  helmet({
    // permite que o frontend (outra porta) exiba as imagens de /uploads
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Público / cliente
app.use('/api/auth', authRoutes);
app.use('/api/products', catalogRouter);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', ordersRouter);

// Painel administrativo (somente ADMIN)
app.use('/api/admin/products', adminProductsRouter);
app.use('/api/admin/orders', adminOrdersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
