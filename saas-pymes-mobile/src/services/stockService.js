import api from './api.js';

const TYPE_MAP = { entrada: 'IN', salida: 'OUT' };

export const stockService = {
  async registerMovement({ productId, quantity, type, note, price }) {
    const backendType = TYPE_MAP[type] ?? type;
    const { data } = await api.post('/stock/movements', {
      productId,
      quantity,
      type: backendType,
      note,
      price,
    });
    return data.data;
  },

  async getStock(productId) {
    const { data } = await api.get(`/stock/products/${productId}`);
    return data.data.stock;
  },

  async getSnapshot() {
    const { data } = await api.get('/stock/snapshot');
    return data.data;
  },

  async getMovements({ productId, type, from, to, page = 1, limit = 20 } = {}) {
    const params = { page, limit };
    if (productId) params.productId = productId;
    if (type)      params.type      = TYPE_MAP[type] ?? type;
    if (from)      params.from      = from;
    if (to)        params.to        = to;
    const { data } = await api.get('/stock/movements', { params });
    return data;
  },

  async clearMovements({ scope, date } = {}) {
  const { data } = await api.delete('/stock/movements', { data: { scope, date } });
  return data.data;
},
};