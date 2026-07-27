// modules/financials/controllers/FinancialController.js

import FinancialService from '../services/FinancialService.js';

const async_ = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── POST /financials/transactions ─────────────────────────────────────────────
export const register = async_(async (req, res) => {
  const tx = await FinancialService.register(req.tenantId, req.userId, req.body);
  res.status(201).json({ status: 'ok', data: tx.toSafeObject() });
});

// ── GET /financials/transactions ──────────────────────────────────────────────
export const list = async_(async (req, res) => {
  const result = await FinancialService.list(req.tenantId, req.query);
  res.json({
    status: 'ok',
    data:   result.data.map((tx) => safeSerialize(tx)),
    meta:   { total: result.total, page: result.page, totalPages: result.totalPages },
  });
});

// ── GET /financials/balance ───────────────────────────────────────────────────
export const getBalance = async_(async (req, res) => {
  const { from, to } = req.query;
  const balance = await FinancialService.getBalance(req.tenantId, { from, to });
  res.json({ status: 'ok', data: balance });
});

// ── GET /financials/summary/categories ───────────────────────────────────────
export const getSummaryByCategory = async_(async (req, res) => {
  const { from, to, type } = req.query;
  const summary = await FinancialService.getSummaryByCategory(req.tenantId, { from, to, type });
  res.json({ status: 'ok', data: summary });
});

// ── GET /financials/summary/timeseries ───────────────────────────────────────
export const getTimeSeries = async_(async (req, res) => {
  const { from, to, groupBy } = req.query;
  const series = await FinancialService.getTimeSeries(req.tenantId, { from, to, groupBy });
  res.json({ status: 'ok', data: series });
});

// ── GET /financials/dashboard ─────────────────────────────────────────────────
// Un solo endpoint que retorna balance + categorías + serie para el dashboard.
export const getDashboard = async_(async (req, res) => {
  const { from, to } = req.query;
  const data = await FinancialService.getDashboard(req.tenantId, { from, to });
  res.json({ status: 'ok', data });
});

// ── Serializer seguro para objetos lean ───────────────────────────────────────
function safeSerialize(tx) {
  if (typeof tx.toSafeObject === 'function') return tx.toSafeObject();
  return {
    id:            tx._id,
    amount:        tx.amount,
    type:          tx.type,
    categoryId:    tx.categoryId,
    categoryLabel: tx.categoryLabel,
    description:   tx.description,
    paymentMethod: tx.paymentMethod,
    note:          tx.note,
    effectiveDate: tx.effectiveDate,
    createdBy:     tx.createdBy,
    createdAt:     tx.createdAt,
  };
}
