import { Router } from 'express';
import * as webhookController from '../../payments/controllers/webhookController.js';

const router = Router();
router.post('/mercadopago', webhookController.mercadoPagoWebhook);

export const basePath = '/webhooks';
export { router };