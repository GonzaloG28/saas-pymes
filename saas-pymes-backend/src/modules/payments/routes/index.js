import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../../core/middleware/validate.js';
import { authorizeLevel } from '../../../core/middleware/roles.js';
import * as webhookController from '../controllers/webhookController.js'
import * as pointDeviceController from '../controllers/pointDeviceController.js';
import * as orderController from '../controllers/orderController.js';
import * as paymentIntentController from '../controllers/paymentIntentController.js';

const router = Router();

// Rutas protegidas — requieren tenant (ya viene resuelto globalmente en app.js)
router.post('/devices', authorizeLevel('staff'),
  validate([body('deviceId').notEmpty().trim()]),
  pointDeviceController.linkDevice);
router.get('/devices', authorizeLevel('staff'), pointDeviceController.listDevices);
router.delete('/devices/:deviceId', authorizeLevel('admin'), pointDeviceController.unlinkDevice);

router.post('/orders', authorizeLevel('staff'),
  validate([body('items').isArray({ min: 1 })]),
  orderController.createOrder);
router.get('/orders/:orderId', authorizeLevel('staff'), orderController.getOrder);

router.post('/point/charge', authorizeLevel('staff'),
  validate([body('orderId').isMongoId()]),
  paymentIntentController.chargeOrder);

if (process.env.NODE_ENV !== 'production') {
  router.post('/orders/:orderId/simulate-payment', authorizeLevel('staff'), (req, res, next) => {
    req.body.orderId = req.params.orderId;
    req.body.tenantId = req.tenantId;
    webhookController.simulateApprovedPayment(req, res, next);
  });
}

export const basePath = '/payments';
export { router };