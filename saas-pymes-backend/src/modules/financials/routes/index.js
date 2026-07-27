// modules/financials/routes/index.js  ← reemplaza el archivo existente

import { Router }         from 'express';
import { body, query }    from 'express-validator';
import { validate }       from '../../../core/middleware/validate.js';
import { authorize, authorizeLevel } from '../../../core/middleware/roles.js';
import * as FinancialController      from '../controllers/FinancialController.js';
import { TRANSACTION_TYPES, PAYMENT_METHODS } from '../models/FinancialTransaction.js';

export const router   = Router();
export const basePath = '/financials';

// ┌──────────────────────────────────────────────────────────────────┐
// │  RUTA                       │  ROL MÍNIMO  │  RAZÓN             │
// ├──────────────────────────────────────────────────────────────────┤
// │  POST /transactions          │  admin       │  Registrar ingreso │
// │  GET  /transactions          │  admin       │  Ver historial     │
// │  GET  /balance               │  admin       │  Ver saldo         │
// │  GET  /summary/categories    │  admin       │  Reportes          │
// │  GET  /summary/timeseries    │  admin       │  Gráficos          │
// │  GET  /dashboard             │  admin       │  Dashboard completo│
// └──────────────────────────────────────────────────────────────────┘
// Nota: staff NO ve datos financieros — es la promesa de privacidad al cliente.

const dateRange = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

const registerRules = [
  body('amount').notEmpty().isFloat({ min: 0.01 }),
  body('type').notEmpty().isIn(Object.values(TRANSACTION_TYPES)),
  body('categoryLabel').optional().trim().isLength({ max: 80 }),
  body('description').optional().trim().isLength({ max: 300 }),
  body('paymentMethod').optional().isIn(Object.values(PAYMENT_METHODS)),
  body('note')
    .if(body('type').equals('ADJUSTMENT'))
    .notEmpty().withMessage('ADJUSTMENT requiere nota'),
  body('effectiveDate').optional().isISO8601(),
];

router.post(
  '/transactions',
  authorizeLevel('admin'),
  validate(registerRules),
  FinancialController.register
);

router.get(
  '/transactions',
  authorizeLevel('admin'),
  validate([
    ...dateRange,
    query('type').optional().isIn(Object.values(TRANSACTION_TYPES)),
    query('paymentMethod').optional().isIn(Object.values(PAYMENT_METHODS)),
    query('page').optional().isInt({ min: 1 }),
  ]),
  FinancialController.list
);

router.get('/balance',             authorizeLevel('admin'), validate(dateRange), FinancialController.getBalance);
router.get('/summary/categories',  authorizeLevel('admin'), validate(dateRange), FinancialController.getSummaryByCategory);
router.get('/summary/timeseries',  authorizeLevel('admin'), validate(dateRange), FinancialController.getTimeSeries);
router.get('/dashboard',           authorizeLevel('admin'), validate(dateRange), FinancialController.getDashboard);
