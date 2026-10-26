/** Erro com status HTTP, tratado pelo errorHandler. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Não autenticado') => new HttpError(401, msg);
export const forbidden = (msg = 'Acesso negado') => new HttpError(403, msg);
export const notFound = (msg = 'Recurso não encontrado') => new HttpError(404, msg);
export const conflict = (msg) => new HttpError(409, msg);
