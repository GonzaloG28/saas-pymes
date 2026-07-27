// src/components/dashboard/PaymentBreakdownRow.jsx
//
// Fila de 3 tarjetas pequeñas: Efectivo / Tarjeta (Point) / Transferencia.
// Requerimiento 3c.

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT, RADIUS } from '../../constants/theme.js';

const fmt = (n) => n == null ? '$0' : `$${Number(n).toLocaleString('es-CL')}`;

export function PaymentBreakdownRow({ theme, breakdown }) {
  const s = makeStyles(theme);

  const items = [
    { key: 'cash',     label: 'Efectivo',      icon: 'cash-outline',      value: breakdown?.cash     ?? 0, color: theme.success },
    { key: 'card',     label: 'Tarjeta',       icon: 'card-outline',      value: breakdown?.card     ?? 0, color: theme.primary },
    { key: 'transfer', label: 'Transferencia', icon: 'swap-horizontal-outline', value: breakdown?.transfer ?? 0, color: '#8B5CF6' },
  ];

  return (
    <View style={s.row}>
      {items.map((it) => (
        <View key={it.key} style={s.card}>
          <View style={[s.iconBox, { backgroundColor: it.color + '18' }]}>
            <Ionicons name={it.icon} size={16} color={it.color} />
          </View>
          <Text style={s.label} numberOfLines={1}>{it.label}</Text>
          <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit>{fmt(it.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  row:     { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md },
  card:    { flex: 1, backgroundColor: theme.cardBackground, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: theme.border, alignItems: 'flex-start' },
  iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  label:   { fontSize: FONT.xs, color: theme.textSecondary, marginBottom: 2 },
  value:   { fontSize: FONT.md, fontWeight: '700', color: theme.textPrimary },
});
