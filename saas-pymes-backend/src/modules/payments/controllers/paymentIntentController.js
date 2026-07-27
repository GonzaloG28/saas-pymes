import paymentIntentService from '../services/paymentIntentService.js';

export const chargeOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const result = await paymentIntentService.chargeOrder(req.tenantId, orderId);
    res.json({ data: result });
  } catch (err) { next(err); }
};