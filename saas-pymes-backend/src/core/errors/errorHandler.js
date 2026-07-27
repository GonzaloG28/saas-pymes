// core/errors/errorHandler.js

import { AppError } from "./appError.js";

export function errorHandler(err, req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production';

  // ── Normalizar errores conocidos de Mongoose ──────────────────────────────
  let error = err;

  if (err.name === 'CastError') {
    error = new AppError(`ID inválido: ${err.value}`, 400, 'INVALID_ID');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'campo';
    error = new AppError(
      `Ya existe un registro con ese valor en: ${field}`,
      409,
      'DUPLICATE_KEY'
    );
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(messages.join('. '), 422, 'VALIDATION_ERROR');
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = new AppError('Token inválido o expirado', 401, 'INVALID_TOKEN');
  }

  // ── Errores operacionales (AppError) ─────────────────────────────────────
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status:  'error',
      code:    error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  // ── Errores no operacionales — bug interno ────────────────────────────────
  console.error('[ERROR INESPERADO]', err);

  return res.status(500).json({
    status:  'error',
    code:    'INTERNAL_SERVER_ERROR',
    message: isProd ? 'Error interno del servidor.' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}
