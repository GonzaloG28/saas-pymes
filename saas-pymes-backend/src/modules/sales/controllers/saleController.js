import saleService from '../services/saleService.js';

export const registerSale = async (req, res, next) => {
  try {
    const result = await saleService.registerSale(req.tenantId, req.userId, req.body);
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
};

export const listSales = async (req, res, next) => {
  try {
    const result = await saleService.listSales(req.tenantId, req.query);
    res.json(result);
  } catch (err) { next(err); }
};

export const getBalance = async (req, res, next) => {
  try {
    const data = await saleService.getBalance(req.tenantId, req.query);
    res.json({ data });
  } catch (err) { next(err); }
};

export const getSalesFlow = async (req, res, next) => {
  try {
    const { startHour, endHour, range } = req.query;
    const data = await saleService.getSalesFlow(req.tenantId, {
      startHour: Number(startHour) || 0,
      endHour:   Number(endHour) || 24,
      range: range || 'day',
    });
    res.json({ data });
  } catch (err) { next(err); }
};

export const getProductStats = async (req, res, next) => {
  try {
    const data = await saleService.getProductStats(req.tenantId, req.params.productId);
    res.json({ data });
  } catch (err) { next(err); }
};

export const getAlerts = async (req, res, next) => {
  try {
    const data = await saleService.getProactiveAlerts(req.tenantId);
    res.json({ data });
  } catch (err) { next(err); }
};

export const clearSales = async (req, res, next) => {
  try {
    const result = await saleService.clearSales(req.tenantId, req.body);
    res.json({ data: result });
  } catch (err) { next(err); }
};