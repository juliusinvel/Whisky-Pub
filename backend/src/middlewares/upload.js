import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { badRequest } from '../lib/http-error.js';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype]}`);
  },
});

/** Upload de UMA imagem no campo "image" (JPG, PNG ou WEBP, até 5 MB). */
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(badRequest('Envie uma imagem JPG, PNG ou WEBP'));
    cb(null, true);
  },
}).single('image');
