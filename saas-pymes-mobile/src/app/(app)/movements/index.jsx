// src/app/(app)/movements/index.jsx

import { useEffect, useState, useCallback } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { stockService } from '../../../services/stockService.js';
import { salesService } from '../../../services/salesService.js';
import { COLORS, SPACING, FONT, RADIUS } from '../../../constants/index.js';

const TYPE_META = {
  IN:  { label: 'Entrada', icon: 'arrow-down-circle', color: COLORS.success },
  OUT: { label: 'Salida',  icon: 'arrow-up-circle',   color: COLORS.danger  },
};

const RANGES = [
  { key: 'day',   label: 'Día' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

function rangeToFromTo(range) {
  const now = new Date();
  if (range === 'day') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (range === 'week') {
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: from.toISOString(), to: now.toISOString() };
}

function groupByDay(movements) {
  const groups = {};
  movements.forEach((m) => {
    const dayKey = new Date(m.effectiveDate).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(m);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function MovementsScreen() {
  const [movements, setMovements] = useState([]);
  const [meta, setMeta]           = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading]     = useState(true);
  const [range, setRange]         = useState('week');
  const [profit, setProfit]       = useState(0);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { from, to } = rangeToFromTo(range);
      const [movRes, salesRes] = await Promise.all([
        stockService.getMovements({ page, limit: 50, from, to }),
        page === 1 ? salesService.list({ from, to, limit: 1000 }) : Promise.resolve(null),
      ]);

      setMovements((prev) => (page === 1 ? movRes.data : [...prev, ...movRes.data]));
      setMeta({ page: movRes.meta?.page ?? page, totalPages: movRes.meta?.totalPages ?? 1 });

      if (salesRes) {
        const totalProfit = salesRes.data.reduce((acc, sVal) => acc + (sVal.profit ?? 0), 0);
        setProfit(totalProfit);
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(1); }, [load]);

  const handleClear = (scope) => {
    const labels = { day: 'de hoy', month: 'de este mes', all: 'todo el historial visible' };
    Alert.alert(
      'Limpiar vista de historial',
      `Se ocultarán los movimientos ${labels[scope]} de esta lista. Tu stock y tus finanzas NO se verán afectados — esta acción solo limpia la vista.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar', style: 'destructive', onPress: async () => {
            try {
              await stockService.clearMovements({ scope, date: new Date().toISOString() });
              await salesService.clearSales({ scope, date: new Date().toISOString() });
              load(1);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message ?? 'No se pudo limpiar la vista');
            }
          }
        },
      ]
    );
  };

  const handleExportPdf = async () => {
    const rows = movements.map((m) => `
      <tr>
        <td>${new Date(m.effectiveDate).toLocaleString('es-CL')}</td>
        <td>${m.productId?.name ?? '—'}</td>
        <td>${TYPE_META[m.type]?.label ?? m.type}</td>
        <td>${m.quantityChange > 0 ? '+' : ''}${m.quantityChange}</td>
        <td>${m.note ?? ''}</td>
      </tr>`).join('');

    const html = `
      <html><head><meta charset="utf-8" /><style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; } table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td, th { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; font-size: 12px; text-align: left; }
        th { background: #f5f5f5; }
      </style></head><body>
        <h1>Historial de movimientos</h1>
        <p>Ganancia del periodo: $${profit.toLocaleString('es-CL')}</p>
        <table><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant.</th><th>Nota</th></tr>${rows}</table>
      </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch { Alert.alert('Error', 'No se pudo generar el PDF'); }
  };

  const handleExportCsv = async () => {
    const header = ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Nota'];
    const rows = movements.map((m) => [
      new Date(m.effectiveDate).toLocaleString('es-CL'),
      m.productId?.name ?? '—',
      TYPE_META[m.type]?.label ?? m.type,
      m.quantityChange,
      m.note ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const fileUri = FileSystem.documentDirectory + 'historial_movimientos.csv';
    try {
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
    } catch { Alert.alert('Error', 'No se pudo generar el archivo'); }
  };

  const sections = groupByDay(movements);

  const renderItem = ({ item: m }) => {
    const meta = TYPE_META[m.type] ?? { label: m.type, icon: 'ellipse', color: COLORS.textSecondary };
    const isActive = m.productId?.isActive !== false;
    return (
      <View style={s.row}>
        <View style={[s.iconCircle, { backgroundColor: meta.color + '15' }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={s.product} numberOfLines={1}>
            {isActive ? (m.productId?.name ?? 'Producto') : 'Producto eliminado'}
          </Text>
          <Text style={s.note} numberOfLines={1}>{m.note || meta.label}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.qty, { color: meta.color }]}>
            {m.quantityChange > 0 ? '+' : ''}{m.quantityChange}
          </Text>
          <Text style={s.time}>{new Date(m.effectiveDate).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>Historial</Text>

      <View style={s.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity key={r.key} onPress={() => setRange(r.key)}
            style={[s.rangeChip, range === r.key && s.rangeChipActive]}>
            <Text style={[s.rangeChipText, range === r.key && s.rangeChipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.actionsRow}>
        <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => handleClear('all')}>
          <Ionicons name="trash-bin-outline" size={16} color={COLORS.danger} />
          <Text style={[s.actionBtnText, { color: COLORS.danger }]}>Borrar el historial</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id ?? m._id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>{title}</Text>
            <Text style={s.sectionHeaderCount}>{data.length} movimiento{data.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={loading && meta.page === 1} onRefresh={() => load(1)} tintColor={COLORS.primary} />}
        onEndReached={() => { if (meta.page < meta.totalPages) load(meta.page + 1); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loading ? <ActivityIndicator color={COLORS.primary} style={{ padding: SPACING.md }} /> : null}
        ListEmptyComponent={!loading && (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.textDisabled} />
            <Text style={s.emptyText}>Sin movimientos en este periodo</Text>
          </View>
        )}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },
  title:  { fontSize: FONT.xxl, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  rangeRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
  rangeChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  rangeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  rangeChipText: { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '600' },
  rangeChipTextActive: { color: COLORS.primary },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginTop: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, elevation: 1 },
  summaryLabel: { fontSize: FONT.xs, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.success },
  actionsRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  actionBtnDanger: { borderColor: COLORS.danger, backgroundColor: COLORS.danger + '15' },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', backgroundColor: COLORS.background, paddingVertical: SPACING.sm },
  sectionHeaderText: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
  sectionHeaderCount: { fontSize: FONT.xs, color: COLORS.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  product:{ fontSize: FONT.md, fontWeight: '600', color: COLORS.textPrimary },
  note:   { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 2 },
  qty:    { fontSize: FONT.md, fontWeight: '700' },
  time:   { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  empty:  { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.sm },
  emptyText: { color: COLORS.textSecondary },
});