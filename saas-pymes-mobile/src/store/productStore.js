import { create } from 'zustand';
import { productService } from '../services/productService.js';
import { stockService }   from '../services/stockService.js';

export const useProductStore = create((set, get) => ({
  products:   [],
  stockMap:   {},
  meta:       { total: 0, page: 1, totalPages: 1 },
  isLoading:  false,
  isCreating: false,
  error:      null,

  fetchProducts: async ({ page = 1, search } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await productService.list({ page, search });
      set({ products: result.data, meta: result.meta, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message ?? 'Error al cargar', isLoading: false });
    }
  },

  createProduct: async (payload) => {
    set({ isCreating: true, error: null });
    try {
      const product = await productService.create(payload);
      set((s) => ({ products: [product, ...s.products], isCreating: false }));
      return product;
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al crear producto';
      set({ error: msg, isCreating: false });
      throw new Error(msg);
    }
  },

  fetchStockSnapshot: async () => {
    try {
      const snapshot = await stockService.getSnapshot();
      const stockMap = {};
      snapshot.forEach(({ productId, stock }) => { stockMap[productId] = stock; });
      set({ stockMap });
    } catch (err) {
      console.warn('No se pudo cargar snapshot de stock:', err.message);
    }
  },

  registerMovement: async (payload) => {
    const movement = await stockService.registerMovement(payload);
    // refresca el stock del producto afectado en el mapa local, sin refetch completo
    const newStock = await stockService.getStock(payload.productId);
    set((s) => ({ stockMap: { ...s.stockMap, [payload.productId]: newStock } }));
    return movement;
  },

  getStockFor: (id) => get().stockMap[id] ?? 0,
}));