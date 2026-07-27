import api, { KEYS } from './api.js';
import * as SecureStore from 'expo-secure-store';

export const authService = {
  async resolveSlug(slug) {
    const { data } = await api.get(`/tenants/by-slug/${slug.toLowerCase().trim()}`);
    return data.data; // { id, name, slug, status }
  },

  async login(tenantId, email, password) {
    const { data } = await api.post(
      '/auth/login',
      { email, password },
      { headers: { 'X-Tenant-ID': tenantId } }
    );
    await SecureStore.setItemAsync(KEYS.TOKEN,  data.accessToken);
    await SecureStore.setItemAsync(KEYS.TENANT, tenantId);
    return data;
  },

  async register(payload) {
  console.log('📤 Enviando registro:', payload);        // ← agregar
  try {
    const { data } = await api.post('/tenants/register', payload);
    console.log('✅ Respuesta del backend:', data);     // ← agregar
    await SecureStore.setItemAsync(KEYS.TOKEN,  data.accessToken);
    await SecureStore.setItemAsync(KEYS.TENANT, data.tenant.id);
    return data;
  } catch (err) {
    console.log('❌ Error completo:', err.response?.data);   // ← agregar
    console.log('❌ Status:', err.response?.status);         // ← agregar
    console.log('❌ URL usada:', err.config?.url);           // ← agregar
    throw err;
  }
},

  async logout() {
    try { await api.post('/auth/logout'); } catch (_) {}
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
    await SecureStore.deleteItemAsync(KEYS.TENANT);
    await SecureStore.deleteItemAsync(KEYS.SLUG);
  },

  async getMe()          { const { data } = await api.get('/auth/me'); return data.data; },
  async getStoredToken() { return SecureStore.getItemAsync(KEYS.TOKEN); },
};
