import jwt from 'jsonwebtoken';
import { AppError } from '../errors/appError.js';

export async function requireSuperAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      throw new AppError('Token de autorización requerido', 401, 'MISSING_TOKEN');

    const token  = authHeader.split(' ')[1];
    const secret = process.env.SUPERADMIN_JWT_SECRET; 
    if (!secret) throw new Error('SUPERADMIN_JWT_SECRET no configurado');

    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'saas-inventory-superadmin', 
    });

    if (payload.type !== 'superadmin' || !payload.adminId)
      throw new AppError('Token inválido', 401, 'INVALID_TOKEN');

    req.adminId = payload.adminId;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return next(new AppError('Token inválido o expirado', 401, 'INVALID_TOKEN'));
    next(err);
  }
}