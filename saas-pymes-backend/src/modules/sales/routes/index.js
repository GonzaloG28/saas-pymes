import { Router } from 'express';
import { body } from 'express-validator';
import { authorizeLevel } from '../../../core/middleware/roles.js';
import { validate }       from '../../../core/middleware/validate.js';
import * as saleController from '../controllers/saleController.js';

const router = Router();

router.post(
  '/',
  authorizeLevel('staff'),
  validate([
    body('productId').isMongoId(),
    body('quantity').isFloat({ gt: 0 }),
    body('unitPrice').optional().isFloat({ min: 0 }),
    body('note').optional().isString().trim(),
  ]),
  saleController.registerSale
);

router.get('/', authorizeLevel('staff'), saleController.listSales);
router.get('/balance', authorizeLevel('admin'), saleController.getBalance);
router.get('/flow',    authorizeLevel('admin'), saleController.getSalesFlow);
router.get('/products/:productId/stats', authorizeLevel('staff'), saleController.getProductStats);
router.delete('/', authorizeLevel('admin'), saleController.clearSales);
router.get('/alerts', authorizeLevel('staff'), saleController.getAlerts);

export const basePath = '/sales';
export { router };