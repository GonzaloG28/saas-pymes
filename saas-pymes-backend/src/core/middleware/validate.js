import { validationResult } from 'express-validator';
import { AppError } from '../errors/appError.js';

/**
 * Recibe un array de reglas de express-validator, las ejecuta,
 * y lanza un AppError 422 si hay errores.
 *
 * Uso: router.post('/', validate([body('email').isEmail()]), controller)
 */
export const validate = (validations) => async (req, res, next) => {
  for (const rule of validations) await rule.run(req);

  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map(({ path, msg }) => ({ field: path, message: msg }));
  const err     = new AppError('Error de validación', 422, 'VALIDATION_ERROR');
  err.details   = details;
  next(err);
};