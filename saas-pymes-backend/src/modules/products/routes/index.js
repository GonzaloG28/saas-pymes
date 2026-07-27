// modules/products/routes/index.js  ← reemplaza el archivo existente

import { Router }        from 'express';
import { body, param, query } from 'express-validator';
import { validate }           from '../../../core/middleware/validate.js';
import { authorize, authorizeLevel } from '../../../core/middleware/roles.js';
import * as ProductController        from '../controllers/ProductController.js';

export const router   = Router();
export const basePath = '/products';

const id = param('id').isMongoId().withMessage('ID inválido');

const bodyRules = [
  body('sku').trim().notEmpty().matches(/^[A-Z0-9\-_]+$/i).toUpperCase(),
  body('name').trim().notEmpty().isLength({ min: 2, max: 120 }),
  body('cost').notEmpty().isFloat({ min: 0 }),
  body('price').notEmpty().isFloat({ min: 0 }),
  body('unit').optional().isIn(['unit', 'kg', 'liter', 'box', 'pack']),
];

// ┌─────────────────────────────────────────────────────────┐
// │  RUTA                │  ROL MÍNIMO  │  RAZÓN            │
// ├─────────────────────────────────────────────────────────┤
// │  GET  /              │  staff       │  Ver catálogo     │
// │  GET  /:id           │  staff       │  Ver detalle      │
// │  POST /              │  admin       │  Crear producto   │
// │  PATCH /:id          │  admin       │  Editar producto  │
// │  DELETE /:id         │  owner       │  Desactivar       │
// └─────────────────────────────────────────────────────────┘

router.get(
  '/',
  authorizeLevel('staff'),
  validate([query('page').optional().isInt({ min: 1 })]),
  ProductController.list
);

router.get(
  '/:id',
  authorizeLevel('staff'),
  validate([id]),
  ProductController.getById
);

router.post(
  '/',
  authorizeLevel('admin'),
  validate(bodyRules),
  ProductController.create
);

router.patch(
  '/:id',
  authorizeLevel('admin'),
  validate([id, ...bodyRules.map((r) => r.optional())]),
  ProductController.update
);

router.delete(
  '/:id',
  authorize('owner'),           // solo owner puede desactivar
  validate([id]),
  ProductController.softDelete
);
