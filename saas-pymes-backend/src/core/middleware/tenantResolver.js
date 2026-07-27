import jwt         from 'jsonwebtoken';
import { AppError } from '../errors/appError.js';

export async function tenantResolver(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      throw new AppError('Token de autorización requerido', 401, 'MISSING_TOKEN');

    const token  = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');

    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer:     process.env.JWT_ISSUER ?? 'saas-inventory',
    });

    if (!payload.tenantId || !payload.userId)
      throw new AppError('Token inválido: faltan claims requeridos', 401, 'INVALID_TOKEN');

    req.tenantId = payload.tenantId;
    req.userId   = payload.userId;
    req.userRole = payload.role;

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return next(new AppError('Token inválido o expirado', 401, 'INVALID_TOKEN'));
    next(err);
  }
}
