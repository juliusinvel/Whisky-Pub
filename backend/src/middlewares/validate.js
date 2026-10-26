/**
 * Valida req.body / req.params / req.query com schemas Zod.
 * O resultado validado fica em req.valid.{body,params,query}
 * (no Express 5 req.query é somente leitura, por isso não sobrescrevemos).
 */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const key of ['body', 'params', 'query']) {
      if (!schemas[key]) continue;
      // parse lança ZodError, que o errorHandler transforma em 400
      req.valid[key] = schemas[key].parse(req[key] ?? {});
    }
    next();
  };
}
