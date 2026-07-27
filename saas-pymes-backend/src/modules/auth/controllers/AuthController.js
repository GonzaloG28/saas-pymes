import AuthService  from '../services/AuthService.js';
import User         from '../models/User.js';
import { AppError } from '../../../core/errors/appError.js';

const async_ = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/api/v1/auth/refresh',
};

export const login = async_( async (req, res) => {
  const { email, password } = req.body;
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) throw new AppError('Header X-Tenant-ID requerido', 400, 'MISSING_TENANT');

  const { accessToken, refreshToken, user } = await AuthService.login(email, password, tenantId);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  res.json({ status: 'ok', accessToken, user: user.toSafeObject() });
});

export const refresh = async_( async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (!raw) throw new AppError('Refresh token no encontrado', 401, 'MISSING_REFRESH_TOKEN');

  const { accessToken, refreshToken } = await AuthService.refresh(raw);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  res.json({ status: 'ok', accessToken });
});

export const logout = async_( async (req, res) => {
  await AuthService.logout(req.userId);
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
  res.json({ status: 'ok', message: 'Sesión cerrada' });
});

export const me = async_( async (req, res) => {
  const user = await User.findOne({ _id: req.userId, tenantId: req.tenantId });
  if (!user) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  res.json({ status: 'ok', data: user.toSafeObject() });
});


export const createUser = async_(async (req, res) => {
  const { email, password, role } = req.body;

  const User = (await import('../models/User.js')).default;

  const exists = await User.exists({ tenantId: req.tenantId, email });
  if (exists)
    throw new AppError(`Ya existe un usuario con email "${email}"`, 409, 'DUPLICATE_EMAIL');

  const user = new User({
    tenantId:     req.tenantId,
    email,
    passwordHash: password, 
    role,
  });

  await user.save();
  res.status(201).json({ status: 'ok', data: user.toSafeObject() });
});


export const verifyOnboardingToken = async_( async (req, res) => {
  const { token } = req.query;
  const { user, tenant } = await AuthService.verifyOnboardingToken(token);
  res.json({
    status: 'ok',
    data: {
      user:   { email: user.email },
      tenant: { name: tenant.name, id: tenant._id },
    },
  });
});

export const completeOnboarding = async_( async (req, res) => {
  const { token, newPassword } = req.body;
  const { user, accessToken, refreshToken } = await AuthService.completeOnboarding(token, newPassword);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  res.json({ status: 'ok', accessToken, user: user.toSafeObject() });
});