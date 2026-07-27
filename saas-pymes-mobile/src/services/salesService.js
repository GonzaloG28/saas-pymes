import api from './api.js';

export const salesService = {
  async registerSale({ productId, quantity, unitPrice, note, paymentMethod }) {
  const { data } = await api.post('/sales', { productId, quantity, unitPrice, note, paymentMethod });
  return data.data;
},

  async list({ from, to, page = 1, limit = 20 } = {}) {
    const params = { page, limit };
    if (from) params.from = from;
    if (to)   params.to   = to;
    const { data } = await api.get('/sales', { params });
    return data;
  },

  async getProductStats(productId) {
    const { data } = await api.get(`/sales/products/${productId}/stats`);
    return data.data; // { totalSold, today, month, year }
  },

  async clearSales({ scope, date } = {}) {
    const { data } = await api.delete('/sales', { data: { scope, date } });
    return data.data;
  },
};