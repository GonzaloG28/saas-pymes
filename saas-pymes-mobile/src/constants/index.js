// src/constants/index.js

// Android emulador → 10.0.2.2 apunta al localhost de la PC
// Dispositivo físico → usar IP local de la PC (ej: 192.168.1.x)
export const API_URL = __DEV__
  ? 'http://192.168.1.100:3000/api/v1' 
  //'http://192.168.1.100:3000/api/v1'
  //'http://192.168.101.8:3000/api/v1'
  : 'http://192.168.101.8:3000/api/v1';

export const COLORS = {
  primary:       '#4F46E5',
  primaryDark:   '#3730A3',
  primaryLight:  '#EEF2FF',
  success:       '#10B981',
  successLight:  '#D1FAE5',
  danger:        '#EF4444',
  dangerLight:   '#FEE2E2',
  warning:       '#F59E0B',
  warningLight:  '#FEF3C7',
  white:         '#FFFFFF',
  background:    '#F8FAFC',
  surface:       '#FFFFFF',
  border:        '#E2E8F0',
  textPrimary:   '#1E293B',
  textSecondary: '#64748B',
  textDisabled:  '#CBD5E1',
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const RADIUS  = { sm: 6, md: 12, lg: 16, full: 999 };
export const FONT    = { sm: 13, md: 15, lg: 17, xl: 20, xxl: 26 };

// ── Paletas para tema claro/oscuro ─────────────────────────────────────────────
export const LIGHT_COLORS = {
  background:     COLORS.background,
  white:          COLORS.white,
  cardBackground: COLORS.surface,
  textPrimary:    COLORS.textPrimary,
  textSecondary:  COLORS.textSecondary,
  textDisabled:   COLORS.textDisabled,
  primary:        COLORS.primary,
  primaryLight:   COLORS.primaryLight,
  success:        COLORS.success,
  successLight:   COLORS.successLight,
  danger:         COLORS.danger,
  dangerLight:    COLORS.dangerLight,
  warning:        COLORS.warning,
  warningLight:   COLORS.warningLight,
  info:           '#3B82F6',
  border:         COLORS.border,
};

export const DARK_COLORS = {
  background:     '#0F1115',
  white:          '#1A1D23',
  cardBackground: '#1A1D23',
  textPrimary:    '#F5F6F8',
  textSecondary:  '#9CA3AF',
  textDisabled:   '#5B616E',
  primary:        '#6366F1',
  primaryLight:   '#312E81',
  success:        '#22C55E',
  successLight:   '#14432A',
  danger:         '#EF4444',
  dangerLight:    '#4A1C1C',
  warning:        '#F59E0B',
  warningLight:   '#4A3510',
  info:           '#60A5FA',
  border:         '#2A2E37',
};