// src/services/financialService.js

import api from './api.js';

export const financialService = {

  // Llamada principal del dashboard — devuelve balance + categorías + serie temporal
  async getDashboard({ startHour = 8, endHour = 20, range = 'day' } = {}) {
  const [balanceRes, flowRes] = await Promise.all([
    api.get('/sales/balance', { params: { range } }),
    api.get('/sales/flow', { params: { startHour, endHour, range } }), // ← range debe estar acá
  ]);
  return {
    balance:    balanceRes.data.data,
    salesFlow:  flowRes.data.data,
    byCategory: [],
  };
},

async getAlerts() {
  const { data } = await api.get('/sales/alerts');
  return data.data; // [{ type, icon, message }]
},

  // Registrar un ingreso o gasto
  async register({ amount, type, categoryLabel, description, paymentMethod, note, effectiveDate } = {}) {
    const { data } = await api.post('/financials/transactions', {
      amount,
      type,
      categoryLabel,
      description,
      paymentMethod,
      note,
      effectiveDate,
    });
    return data.data;
  },

  // Listar transacciones con filtros opcionales
  async list({ type, from, to, paymentMethod, page = 1, limit = 30 } = {}) {
    const params = { page, limit };
    if (type)          params.type          = type;
    if (from)          params.from          = from;
    if (to)            params.to            = to;
    if (paymentMethod) params.paymentMethod = paymentMethod;
    const { data } = await api.get('/financials/transactions', { params });
    return data; // { data: [], meta: { total, page, totalPages } }
  },

  // Solo el balance del período (sin categorías ni serie)
  async getBalance({ from, to } = {}) {
    const params = {};
    if (from) params.from = from;
    if (to)   params.to   = to;
    const { data } = await api.get('/financials/balance', { params });
    return data.data; // { totalIncome, totalExpense, balance }
  },
};
