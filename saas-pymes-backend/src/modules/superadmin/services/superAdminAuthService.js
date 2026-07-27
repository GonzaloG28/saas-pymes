import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';
import { AppError } from '../../../core/errors/appError.js';

class SuperAdminAuthService {
  async login(email, password) {
    const admin = await AdminUser.findOne({ email: email.toLowerCase().trim(), isActive: true }).select('+passwordHash');
    if (!admin) throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');

    const valid = await admin.comparePassword(password);
    if (!valid) throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');

    const accessToken = jwt.sign(
      { adminId: admin._id, type: 'superadmin' },
      process.env.SUPERADMIN_JWT_SECRET,
      { expiresIn: '8h', issuer: 'saas-inventory-superadmin' }
    );

    return { admin, accessToken };
  }
}

export default new SuperAdminAuthService();