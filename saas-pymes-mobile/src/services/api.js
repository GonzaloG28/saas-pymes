// src/services/api.js
// Cliente HTTP centralizado con refresh automático de token.

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/index.js';

export const KEYS = {
  TOKEN:    'accessToken',
  TENANT:   'tenantId',
  SLUG:     'tenantSlug',
};

console.log('🌐 API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: adjuntar Bearer token ───────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(KEYS.TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: renovar token en 401 automáticamente ───────────────────────────
let isRefreshing = false;
let queue        = [];

const flush = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status !== 401 || orig._retry)
      return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => queue.push({ resolve, reject }))
        .then((token) => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); });
    }

    orig._retry   = true;
    isRefreshing  = true;

    try {
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`, {}, { withCredentials: true }
      );
      await SecureStore.setItemAsync(KEYS.TOKEN, data.accessToken);
      flush(null, data.accessToken);
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(orig);
    } catch (err) {
      flush(err);
      await SecureStore.deleteItemAsync(KEYS.TOKEN);
      await SecureStore.deleteItemAsync(KEYS.TENANT);
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
