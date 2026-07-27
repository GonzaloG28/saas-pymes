import { create } from 'zustand';
import { authService } from '../services/authService.js';

export const useAuthStore = create((set) => ({
  user:        null,
  tenantId:    null,
  tenantName:  null,
  isLoggedIn:  false,
  isLoading:   true,
  error:       null,

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const token = await authService.getStoredToken();
      if (!token) return set({ isLoading: false, isLoggedIn: false });
      const user = await authService.getMe();
      set({ user, isLoggedIn: true, isLoading: false });
    } catch {
      set({ isLoggedIn: false, isLoading: false });
    }
  },

  resolveSlug: async (slug) => {
    const tenant = await authService.resolveSlug(slug);
    if (tenant.status !== 'active')
      throw new Error('Esta empresa está suspendida.');
    return tenant;
  },

  // Firma real usada por login.jsx: login(tenantId, email, password)
  login: async (tenantId, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.login(tenantId, email, password);
      set({ user, tenantId, tenantName: user.tenantName ?? null, isLoggedIn: true, isLoading: false });
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message ?? 'Credenciales inválidas';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, tenantId: null, tenantName: null, isLoggedIn: false, error: null });
  },

  clearError: () => set({ error: null }),
}));