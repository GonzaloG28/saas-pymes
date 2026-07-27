// modules/tenants/controllers/TenantController.js

import TenantService from '../services/TenantService.js';
import AuthService   from '../../auth/services/AuthService.js';

const async_ = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── POST /tenants/register — RUTA PÚBLICA ─────────────────────────────────────
// Crea empresa + owner + devuelve tokens listos para usar.
// El cliente queda logueado inmediatamente tras el registro.
export const register = async_(async (req, res) => {
  const { companyName, contactEmail, contactPhone, country, ownerPassword } = req.body;

  const { tenant, owner } = await TenantService.register({
    companyName,
    contactEmail,
    contactPhone,
    country,
    ownerPassword,
  });

  // Login automático post-registro: emitir par de tokens
  const { accessToken, refreshToken } = await AuthService._issueTokenPair(owner);

  // Refresh token en cookie httpOnly (igual que en login)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/api/v1/auth/refresh',
  });

  res.status(201).json({
    status: 'ok',
    message: `Empresa "${tenant.name}" registrada exitosamente.`,
    accessToken,
    tenant: tenant.toSafeObject(),
    user:   owner.toSafeObject(),
  });
});

// ── GET /tenants/me — RUTA PROTEGIDA (cualquier rol) ─────────────────────────
// Devuelve los datos del tenant actual (el del JWT).
export const getMyTenant = async_(async (req, res) => {
  const tenant = await TenantService.getById(req.tenantId);
  res.json({ status: 'ok', data: tenant.toSafeObject() });
});

// ── PATCH /tenants/me — RUTA PROTEGIDA (solo owner) ──────────────────────────
export const updateMyTenant = async_(async (req, res) => {
  const tenant = await TenantService.update(req.tenantId, req.body);
  res.json({ status: 'ok', data: tenant.toSafeObject() });
});

// ── GET /tenants/by-slug/:slug — RUTA PÚBLICA ────────────────────────────────
// La app mobile la usa en la pantalla de login para resolver el tenantId
// a partir del slug que escribe el usuario (ej: "mi-empresa").
export const getBySlug = async_(async (req, res) => {
  const tenant = await TenantService.getBySlug(req.params.slug);
  // Solo exponer lo mínimo necesario para el login — no datos internos
  res.json({
    status: 'ok',
    data: {
      id:     tenant._id,
      name:   tenant.name,
      slug:   tenant.slug,
      status: tenant.status,
    },
  });
});
