import { create } from 'zustand';
import { financialService } from '../services/financialService.js';

export const useDashboardStore = create((set) => ({
  balance:          null,
  byCategory:       [],
  salesFlow:        { labels: [], data: [] },
  paymentBreakdown: { cash: 0, card: 0, transfer: 0 },
  topProducts:      [],
  alerts:           [],
  isLoading:        false,
  error:            null,

  fetchDashboard: async ({ startHour = 8, endHour = 20, range = 'day' } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const [data, alerts] = await Promise.all([
        financialService.getDashboard({ startHour, endHour, range }),
        financialService.getAlerts(),
      ]);
      set({
        balance:          data.balance,
        byCategory:       data.byCategory,
        salesFlow:        data.salesFlow,
        paymentBreakdown: data.balance?.paymentBreakdown ?? { cash: 0, card: 0, transfer: 0 },
        topProducts:      data.balance?.topProducts ?? [],
        alerts,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.response?.data?.message ?? 'Error al cargar', isLoading: false });
    }
  },
}));