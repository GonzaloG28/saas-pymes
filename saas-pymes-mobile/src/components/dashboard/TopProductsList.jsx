// src/components/dashboard/TopProductsList.jsx
//
// Lista de los 3 productos más vendidos del período. Requerimiento 3e.

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card.jsx';
import { SPACING, FONT, RADIUS } from '../../constants/theme.js';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function TopProductsList({ theme, products = [] }) {
  const s = makeStyles(theme);

  if (!products.length) {
    return (
      <Card style={s.card}>
        <Text style={s.title}>Más vendidos</Text>
        <View style={s.emptyBox}>
          <Ionicons name="trophy-outline" size={24} color={theme.textDisabled} />
          <Text style={s.emptyText}>Sin ventas registradas aún</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={s.card}>
      <Text style={s.title}>Más vendidos</Text>
      {products.map((p, i) => (
        <View key={p.productId} style={[s.row, i < products.length - 1 && s.rowBorder]}>
          <View style={[s.medal, { backgroundColor: (MEDAL_COLORS[i] ?? theme.border) + '30' }]}>
            <Text style={[s.medalText, { color: MEDAL_COLORS[i] ?? theme.textSecondary }]}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{p.name}</Text>
            <Text style={s.sku}>{p.sku}</Text>
          </View>
          <Text style={s.qty}>{p.unitsSold} u.</Text>
        </View>
      ))}
    </Card>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card:      { marginBottom: SPACING.lg },
  title:     { fontSize: FONT.md, fontWeight: '700', color: theme.textPrimary, marginBottom: SPACING.sm },
  row:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  medal:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontSize: FONT.sm, fontWeight: '800' },
  name:      { fontSize: FONT.sm, fontWeight: '600', color: theme.textPrimary },
  sku:       { fontSize: FONT.xs, color: theme.textSecondary, marginTop: 1 },
  qty:       { fontSize: FONT.md, fontWeight: '700', color: theme.primary },
  emptyBox:  { alignItems: 'center', paddingVertical: SPACING.lg, gap: 6 },
  emptyText: { fontSize: FONT.sm, color: theme.textDisabled },
});
