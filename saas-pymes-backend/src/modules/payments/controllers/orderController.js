import orderService from '../services/orderService.js';

export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.create(req.tenantId, req.userId, req.body);
    res.status(201).json({ data: order.toSafeObject() });
  } catch (err) { next(err); }
};

export const getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getById(req.tenantId, req.params.orderId);
    res.json({ data: order.toSafeObject() });
  } catch (err) { next(err); }
};