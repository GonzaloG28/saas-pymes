import jwt    from 'jsonwebtoken';
import crypto from 'crypto';
import User   from '../models/User.js';
import Tenant from '../../tenants/models/Tenant.js';
import OnboardingToken from '../models/OnboardingToken.js';
import { AppError } from '../../../core/errors/appError.js';

const secret        = () => process.env.JWT_SECRET         ?? (() => { throw new Error('JWT_SECRET no configurado') })();
const refreshSecret = () => process.env.JWT_REFRESH_SECRET ?? (() => { throw new Error('JWT_REFRESH_SECRET no configurado') })();
const ISSUER        = process.env.JWT_ISSUER ?? 'saas-inventory';
const ACCESS_EXP    = process.env.JWT_EXPIRES_IN      ?? '15m';
const REFRESH_EXP   = process.env.JWT_REFRESH_EXPIRES ?? '7d';

class AuthService {

  async login(email, password, tenantId) {
    const user = await User
      .findOne({ tenantId, email: email.toLowerCase().trim() })
      .select('+passwordHash +loginAttempts +lockUntil');

    const GENERIC = 'Credenciales inválidas';
    if (!user || !user.isActive) throw new AppError(GENERIC, 401, 'INVALID_CREDENTIALS');
    if (user.isLocked)           throw new AppError('Cuenta bloqueada 30 min.', 423, 'ACCOUNT_LOCKED');

    const ok = await user.comparePassword(password);
    if (!ok) {
      await user.recordFailedAttempt();
      throw new AppError(GENERIC, 401, 'INVALID_CREDENTIALS');
    }

    await user.recordSuccessfulLogin();
    const tokens = await this._issueTokenPair(user);
    return { ...tokens, user };
  }

  async refresh(rawToken) {
    let payload;
    try {
      payload = jwt.verify(rawToken, refreshSecret(), { issuer: ISSUER });
    } catch {
      throw new AppError('Refresh token inválido o expirado', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(payload.userId).select('+refreshTokenHash');
    if (!user?.isActive) throw new AppError('Usuario no encontrado', 401, 'INVALID_REFRESH_TOKEN');

    if (user.refreshTokenHash !== this._hash(rawToken)) {
      await user.updateOne({ $unset: { refreshTokenHash: 1 } });
      throw new AppError('Sesión inválida. Inicia sesión de nuevo.', 401, 'TOKEN_REUSE_DETECTED');
    }

    return this._issueTokenPair(user);
  }

  async logout(userId) {
    await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
  }

  async _issueTokenPair(user) {
    const payload = {
      tenantId: user.tenantId.toString(),
      userId:   user._id.toString(),
      role:     user.role,
    };

    const accessToken  = jwt.sign(payload, secret(), { expiresIn: ACCESS_EXP, issuer: ISSUER, algorithm: 'HS256' });
    const refreshToken = jwt.sign({ userId: user._id.toString() }, refreshSecret(), { expiresIn: REFRESH_EXP, issuer: ISSUER, algorithm: 'HS256' });

    await user.updateOne({ refreshTokenHash: this._hash(refreshToken) });
    return { accessToken, refreshToken };
  }

  _hash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // 1. Validar el token de onboarding y devolver info básica (para que la app sepa a quién saludar)
async verifyOnboardingToken(rawToken) {
  const record = await OnboardingToken.verify(rawToken);
  if (!record) throw new AppError('Enlace inválido o expirado', 400, 'INVALID_ONBOARDING_TOKEN');

  const user = await User.findById(record.userId);
  const tenant = await Tenant.findById(record.tenantId);
  return { tokenRecordId: record._id, user, tenant };
}

// 2. Completar el onboarding: fija la contraseña definitiva
async completeOnboarding(rawToken, newPassword) {
  const record = await OnboardingToken.verify(rawToken);
  if (!record) throw new AppError('Enlace inválido o expirado', 400, 'INVALID_ONBOARDING_TOKEN');

  const user = await User.findById(record.userId);
  if (!user) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');

  user.passwordHash = newPassword; // el pre('save') del schema hashea
  user.mustChangePassword = false;
  user.passwordSetAt = new Date();
  await user.save();

  record.usedAt = new Date();
  await record.save();

  // Emitir tokens de sesión normales — el usuario queda logueado tras fijar su clave
  const { accessToken, refreshToken } = await this._issueTokenPair(user);
  return { user, accessToken, refreshToken };
}
}

export default new AuthService();
