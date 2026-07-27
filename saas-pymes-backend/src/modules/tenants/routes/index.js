// modules/tenants/routes/index.js

import { Router }    from 'express';
import { body, param } from 'express-validator';
import { validate }    from '../../../core/middleware/validate.js';
import { authorize }   from '../../../core/middleware/roles.js';
import { tenantResolver } from '../../../core/middleware/tenantResolver.js';
import * as TenantController from '../controllers/TenantController.js';

export const router   = Router();
export const basePath = '/tenants';

// ── Validaciones ──────────────────────────────────────────────────────────────
const registerRules = [
  body('companyName')
    .trim()
    .notEmpty().withMessage('El nombre de empresa es obligatorio')
    .isLength({ min: 2, max: 120 }).withMessage('Entre 2 y 120 caracteres'),

  body('contactEmail')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),

  body('ownerPassword')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('Debe contener al menos un número'),

  body('contactPhone')
    .optional()
    .trim()
    .isLength({ max: 20 }),

  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 }).withMessage('Usar código ISO de 2 letras (ej: CL)'),
];

// ── RUTAS PÚBLICAS (sin tenantResolver) ───────────────────────────────────────

// Registro de nueva empresa — punto de entrada al SaaS
router.post(
  '/register',
  validate(registerRules),
  TenantController.register
);

// Resolver slug → tenantId (para la pantalla de login de la app mobile)
router.get(
  '/by-slug/:slug',
  validate([
    param('slug')
      .trim()
      .matches(/^[a-z0-9\-]+$/).withMessage('Slug inválido'),
  ]),
  TenantController.getBySlug
);

// ── RUTAS PROTEGIDAS (requieren JWT) ──────────────────────────────────────────
// tenantResolver se aplica individualmente aquí porque este router
// también maneja rutas públicas arriba.

router.get(
  '/me',
  tenantResolver,
  TenantController.getMyTenant
);

router.patch(
  '/me',
  tenantResolver,
  authorize('owner'),
  validate([
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('contactPhone').optional().trim().isLength({ max: 20 }),
    body('country').optional().trim().isLength({ min: 2, max: 2 }),
  ]),
  TenantController.updateMyTenant
);
