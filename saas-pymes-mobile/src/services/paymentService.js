import api from './api.js';

export const paymentService = {
  // ── Dispositivos ──────────────────────────────────────────────────────────
  async linkDevice({ deviceId, label, mpAccessToken }) {
    const { data } = await api.post('/payments/devices', { deviceId, label, mpAccessToken });
    return data.data;
  },

  async listDevices() {
    const { data } = await api.get('/payments/devices');
    return data.data;
  },

  async unlinkDevice(deviceId) {
    const { data } = await api.delete(`/payments/devices/${deviceId}`);
    return data.data;
  },

  // ── Órdenes ───────────────────────────────────────────────────────────────
  async createOrder(items) {
    const { data } = await api.post('/payments/orders', { items });
    return data.data;
  },

  async getOrder(orderId) {
    const { data } = await api.get(`/payments/orders/${orderId}`);
    return data.data;
  },

  // ── Cobro con Point ───────────────────────────────────────────────────────
  async chargeOrder(orderId) {
    const { data } = await api.post('/payments/point/charge', { orderId });
    return data.data;
  },
};