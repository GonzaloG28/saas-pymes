// modules/stock/controllers/StockController.js

import stockService from '../services/StockService.js';

export const registerMovement = async (req, res, next) => {
  try {
    const movement = await stockService.registerMovement(req.tenantId, req.userId, req.body);
    res.status(201).json({ data: movement.toSafeObject() });
  } catch (err) { next(err); }
};

export const getMovements = async (req, res, next) => {
  try {
    const result = await stockService.getMovements(req.tenantId, req.query);
    res.json({ data: result.data, meta: { total: result.total, page: result.page, totalPages: result.totalPages } });
  } catch (err) { next(err); }
};

export const getStock = async (req, res, next) => {
  try {
    const stock = await stockService.getCurrentStock(req.tenantId, req.params.productId);
    res.json({ data: { stock } });
  } catch (err) { next(err); }
};

export const getSnapshot = async (req, res, next) => {
  try {
    const data = await stockService.getStockSnapshot(req.tenantId);
    res.json({ data });
  } catch (err) { next(err); }
};


export const clearMovements = async (req, res, next) => {
  try {
    const result = await stockService.clearMovements(req.tenantId, req.body);
    res.json({ data: result });
  } catch (err) { next(err); }
};