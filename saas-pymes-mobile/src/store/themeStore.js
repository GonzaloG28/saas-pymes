import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/index.js';

const FALLBACK_THEME = {
  background: '#F5F6F8', white: '#FFFFFF', cardBackground: '#FFFFFF',
  textPrimary: '#1A1A1A', textSecondary: '#6B7280', textDisabled: '#B0B4BA',
  primary: '#2563EB', primaryLight: '#DBEAFE', success: '#16A34A', successLight: '#D1FAE5',
  danger: '#DC2626', dangerLight: '#FEE2E2', warning: '#D97706', warningLight: '#FEF3C7',
  info: '#3B82F6', border: '#E5E7EB',
};

const THEME_STORAGE_KEY = '@app_theme_mode';

export const useThemeStore = create((set, get) => ({
  mode:  Appearance.getColorScheme() ?? 'light',
  theme: LIGHT_COLORS ?? FALLBACK_THEME,

  loadSavedTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        set({ mode: saved, theme: (saved === 'dark' ? DARK_COLORS : LIGHT_COLORS) ?? FALLBACK_THEME });
      }
    } catch {}
  },

  toggleTheme: () => {
    const next = get().mode === 'light' ? 'dark' : 'light';
    set({ mode: next, theme: (next === 'dark' ? DARK_COLORS : LIGHT_COLORS) ?? FALLBACK_THEME });
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  },
}));
