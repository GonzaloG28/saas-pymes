import api from './api.js';
 
export const productService = {
  async list({ page = 1, limit = 20, search } = {}) {
    const params = { page, limit };
    if (search) params.search = search;
    const { data } = await api.get('/products', { params });
    return data;
  },
 
  async getById(id) {
    const { data } = await api.get(`/products/${id}`);
    return data.data;
  },
 
  async create(payload) {
    const { data } = await api.post('/products', payload);
    return data.data;
  },
 
  async update(id, payload) {
    const { data } = await api.patch(`/products/${id}`, payload);
    return data.data;
  },
 
  async deactivate(id) {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  },
};