import { Router } from 'express';
import { body } from 'express-validator';
import { authorizeLevel } from '../../../core/middleware/roles.js';
import { validate }       from '../../../core/middleware/validate.js';
import * as stockController from '../controllers/StockController.js';

const router = Router();

// tenantResolver ya se aplicó globalmente en app.js antes de moduleLoader — no se repite aquí.

router.post(
  '/movements',
  authorizeLevel('staff'),
  validate([
    body('productId').isMongoId(),
    body('quantity').isFloat({ gt: 0 }),
    body('type').isIn(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'LOSS', 'RETURN']),
    body('note').optional().isString().trim(),
  ]),
  stockController.registerMovement
);

router.get('/movements', authorizeLevel('staff'), stockController.getMovements);
router.get('/products/:productId', authorizeLevel('staff'), stockController.getStock);
router.get('/snapshot', authorizeLevel('staff'), stockController.getSnapshot);
router.delete('/movements', authorizeLevel('admin'), stockController.clearMovements);

export const basePath = '/stock';
export { router };