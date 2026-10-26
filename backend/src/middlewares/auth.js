import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../lib/http-error.js';

/** Exige um token JWT válido no header Authorization: Bearer <token>. */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Token não informado'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch {
    return next(unauthorized('Token inválido ou expirado'));
  }
}

/** Restringe a rota a determinados níveis de acesso. Ex.: authorize('ADMIN') */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}

export function signToken(user) {
  return jwt.sign({ role: user.role, name: user.name }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN,
  });
}
