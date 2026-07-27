export class AppError extends Error {
  /**
   * @param {string} message    Mensaje legible (no exponer internals en prod)
   * @param {number} statusCode HTTP status
   * @param {string} code       Código interno para el cliente
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name          = 'AppError';
    this.statusCode    = statusCode;
    this.code          = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}