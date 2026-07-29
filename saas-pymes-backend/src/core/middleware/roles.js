// Sistema de roles jerárquico.
//
// Jerarquía (de mayor a menor privilegio):
//   owner  → dueño del tenant, acceso total
//   admin  → gestión operativa, sin acceso a configuración crítica
//   staff  → operación diaria, solo lectura en financiero
//
// Uso en rutas:
//   router.delete('/:id', authorize('owner'), controller.delete)
//   router.get('/balance', authorize('owner', 'admin'), controller.getBalance)
//   router.get('/',        authorize('owner', 'admin', 'staff'), controller.list)
//
// Atajo con nivel mínimo requerido:
//   router.get('/', authorizeLevel('staff'), controller.list)
//   → acepta staff, admin y owner (cualquiera de igual o mayor nivel)

import { AppError } from '../errors/AppError.js';

export const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
});

const ROLE_LEVEL = Object.freeze({
  [ROLES.STAFF]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.OWNER]: 3,
});

/**
 * Permite solo los roles listados explícitamente.
 *
 * @example
 *   router.delete('/:id', authorize('owner'), controller.softDelete)
 *   router.get('/balance', authorize('owner', 'admin'), controller.getBalance)
 */
export const authorize = (...allowedRoles) => (req, _res, next) => {
  const role = req.userRole;

  if (!role)
    return next(new AppError('Sin rol asignado. Token inválido.', 401, 'MISSING_ROLE'));

  if (!allowedRoles.includes(role))
    return next(new AppError(
      `Acceso denegado. Se requiere: ${allowedRoles.join(' o ')}.`,
      403,
      'FORBIDDEN'
    ));

  next();
};

/**
 * Permite el rol indicado y cualquiera de mayor jerarquía.
 *
 * @example
 *   router.get('/', authorizeLevel('staff'), controller.list)
 *
 *   router.post('/', authorizeLevel('admin'), controller.create)
 */
export const authorizeLevel = (minimumRole) => (req, _res, next) => {
  const role = req.userRole;

  if (!role)
    return next(new AppError('Sin rol asignado. Token inválido.', 401, 'MISSING_ROLE'));

  const userLevel    = ROLE_LEVEL[role]        ?? 0;
  const minimumLevel = ROLE_LEVEL[minimumRole] ?? 99;

  if (userLevel < minimumLevel)
    return next(new AppError(
      `Acceso denegado. Se requiere nivel "${minimumRole}" o superior.`,
      403,
      'FORBIDDEN'
    ));

  next();
};

/**
 * Helper para lógica condicional dentro de un service o controller.
 * No lanza error — devuelve boolean.
 *
 * @example
 *   if (hasMinimumRole(req.userRole, 'admin')) { ... }
 */
export const hasMinimumRole = (userRole, minimumRole) => {
  const userLevel    = ROLE_LEVEL[userRole]    ?? 0;
  const minimumLevel = ROLE_LEVEL[minimumRole] ?? 99;
  return userLevel >= minimumLevel;
};
