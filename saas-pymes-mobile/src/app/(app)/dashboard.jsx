import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore }      from '../../store/authStore.js';
import { useDashboardStore } from '../../store/dashboardStore.js';
import { useProductStore }   from '../../store/productStore.js';
import { useThemeStore }     from '../../store/themeStore.js';
import { Card } from '../../components/ui/Card.jsx';
import { SPACING, FONT, RADIUS } from '../../constants/theme.js';

import { DashboardHeader }      from '../../components/dashboard/DashboardHeader.jsx';
import { PaymentBreakdownRow }  from '../../components/dashboard/PaymentBreakdownRow.jsx';
import { TopProductsList }      from '../../components/dashboard/TopProductsList.jsx';

const fmt = (n) => n == null ? '—' : `$${Number(n).toLocaleString('es-CL')}`;

const DEFAULT_START = 8;
const DEFAULT_END   = 20;
const HOURS_STORAGE_KEY = '@dashboard_hour_range';

const RANGES = [
  { key: 'day',   label: 'Día' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const RANGE_UNIT_LABEL = { day: 'hoy', week: 'esta semana', month: 'este mes' };

const BAR_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#8BC34A', '#FFC107', '#673AB7', '#E91E63',
  '#3F51B5', '#009688', '#FF5722', '#795548', '#607D8B',
];

const METRIC_INFO = {
  products: { title: 'Productos', description: 'Cantidad total de productos activos en inventario.' },
  unitsSold: { title: 'Vendidos', description: 'Unidades vendidas en el período seleccionado.' },
  income: { title: 'Ingresos', description: 'Dinero total recibido por ventas en el período.' },
  expense: { title: 'Egresos', description: 'Dinero gastado comprando stock nuevo en el período.' },
  balance: { title: 'Balance', description: 'Ingresos menos Egresos del período.' },
  margin: { title: 'Margen de ventas', description: 'Ganancia real: diferencia entre precio de venta y costo.' },
};

export default function DashboardScreen() {
  const { user, tenantName, logout } = useAuthStore();
  const { balance, byCategory, alerts = [], paymentBreakdown, isLoading: dashLoading, fetchDashboard, salesFlow, topProducts } = useDashboardStore();
  const { products, isLoading: prodLoading, fetchProducts, fetchStockSnapshot, getStockFor } = useProductStore();
  const { theme, mode, toggleTheme } = useThemeStore();
  
  const s = makeStyles(theme);

  const [startHour, setStartHour] = useState(DEFAULT_START);
  const [endHour, setEndHour]     = useState(DEFAULT_END);
  const [range, setRange]         = useState('day');
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [infoKey, setInfoKey]     = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(HOURS_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          if (typeof saved.startHour === 'number') setStartHour(saved.startHour);
          if (typeof saved.endHour === 'number')   setEndHour(saved.endHour);
        }
      })
      .finally(() => setHoursLoaded(true));
  }, []);

  useEffect(() => {
    if (!hoursLoaded) return;
    AsyncStorage.setItem(HOURS_STORAGE_KEY, JSON.stringify({ startHour, endHour })).catch(() => {});
  }, [startHour, endHour, hoursLoaded]);

  const load = useCallback(() => {
    fetchDashboard({ startHour, endHour, range });
    fetchProducts({ page: 1 });
    fetchStockSnapshot();
  }, [startHour, endHour, range]);

  // Esto reemplaza tu listener de navegación. Se ejecuta CADA VEZ que la pantalla gana foco.
  useFocusEffect(
    useCallback(() => {
      if (hoursLoaded) {
        load();
      }
    }, [hoursLoaded, load])
  );

  const isLoading = dashLoading || prodLoading;

  const resetView = () => {
    setStartHour(DEFAULT_START);
    setEndHour(DEFAULT_END);
    setRange('day');
  };

  const lowStock = products.filter((p) => getStockFor(p.id) < 5);
  const rawLabels = salesFlow?.labels?.length ? salesFlow.labels : [];
  const rawData   = salesFlow?.data?.length ? salesFlow.data : [];
  const hasData    = rawData.length > 0 && rawData.some((v) => v > 0);
  const maxValue   = Math.max(1, ...rawData);

  const incStart = () => setStartHour((h) => Math.min(h + 1, endHour - 1));
  const decStart = () => setStartHour((h) => Math.max(0, h - 1));
  const incEnd   = () => setEndHour((h) => Math.min(24, h + 1));
  const decEnd   = () => setEndHour((h) => Math.max(h - 1, startHour + 1));

  const chartTitle = range === 'day' ? 'Ventas por hora' : range === 'week' ? 'Ventas por día' : 'Ventas por semana';

  const ALERT_STYLES = {
    warning: { bg: theme.warningLight, border: theme.warning, color: theme.mode === 'dark' ? '#FDE68A' : '#92400E' },
    success: { bg: theme.successLight, border: theme.success, color: theme.mode === 'dark' ? '#BBF7D0' : '#065F46' },
    danger:  { bg: theme.dangerLight,  border: theme.danger,  color: theme.mode === 'dark' ? '#FECACA' : '#991B1B' },
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* 1. Controla el color de la barra superior de tu celular */}
      <StatusBar 
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.background} 
      />

      {/* 2. Loading Overlay: Bloquea la pantalla y muestra un spinner mientras carga */}
      {isLoading && (
        <Modal visible={isLoading} transparent animationType="fade">
        <View style={s.fullScreenLoading}>
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={s.loadingText}>Actualizando...</Text>
          </View>
        </View>
      </Modal>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.primary} />}
      >
        <DashboardHeader
          theme={theme}
          companyName={tenantName}
          mode={mode}
          onToggleTheme={toggleTheme}
          onLogout={logout}
        />

        {alerts.length > 0 && (
          <View style={{ gap: SPACING.xs, marginBottom: SPACING.lg }}>
            {alerts.map((a, i) => {
              const aStyle = ALERT_STYLES[a.type] ?? ALERT_STYLES.warning;
              return (
                <View key={i} style={[s.alertBanner, { backgroundColor: aStyle.bg, borderLeftColor: aStyle.border }]}>
                  <Ionicons name={`${a.icon}-outline`} size={18} color={aStyle.border} />
                  <Text style={[s.alertBannerText, { color: aStyle.color }]}>{a.message}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={s.filtersCard}>
          <View style={s.filtersHeader}>
            <Text style={s.filtersTitle}>{chartTitle}</Text>
            <TouchableOpacity onPress={resetView} style={s.resetBtn}>
              <Ionicons name="refresh-outline" size={14} color={theme.primary} />
              <Text style={s.resetBtnText}>Reiniciar</Text>
            </TouchableOpacity>
          </View>

          <View style={s.rangeRow}>
            {RANGES.map((r) => (
              <TouchableOpacity key={r.key} onPress={() => setRange(r.key)}
                style={[s.rangeChip, range === r.key && s.rangeChipActive]}>
                <Text style={[s.rangeChipText, range === r.key && s.rangeChipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {range === 'day' && (
            <View style={s.hourSelectors}>
              <View style={s.hourGroup}>
                <Text style={s.hourGroupLabel}>Desde</Text>
                <View style={s.hourControls}>
                  <TouchableOpacity onPress={decStart} style={s.hourBtn}>
                    <Ionicons name="remove" size={16} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <Text style={s.hourText}>{startHour}:00</Text>
                  <TouchableOpacity onPress={incStart} style={s.hourBtn}>
                    <Ionicons name="add" size={16} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.hourGroup}>
                <Text style={s.hourGroupLabel}>Hasta</Text>
                <View style={s.hourControls}>
                  <TouchableOpacity onPress={decEnd} style={s.hourBtn}>
                    <Ionicons name="remove" size={16} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <Text style={s.hourText}>{endHour}:00</Text>
                  <TouchableOpacity onPress={incEnd} style={s.hourBtn}>
                    <Ionicons name="add" size={16} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <Card style={s.chartCard}>
            {hasData ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rectRow}>
                {rawLabels.map((label, i) => {
                  const value = rawData[i] ?? 0;
                  const heightPct = Math.max(8, (value / maxValue) * 100);
                  const color = BAR_COLORS[i % BAR_COLORS.length];
                  return (
                    <View key={label + i} style={s.rectCol}>
                      <Text style={s.rectValue}>{value}</Text>
                      <View style={s.rectTrack}>
                        <View style={[s.rectFill, { height: `${heightPct}%`, backgroundColor: value > 0 ? color : theme.border }]} />
                      </View>
                      <Text style={s.rectLabel} numberOfLines={1}>{label}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={s.emptyChart}>
                <Ionicons name="bar-chart-outline" size={32} color={theme.textDisabled} />
                <Text style={s.emptyChartText}>Sin ventas registradas en este periodo</Text>
              </View>
            )}
          </Card>

          <PaymentBreakdownRow theme={theme} breakdown={paymentBreakdown} />

          {balance?.topProduct && (
            <View style={s.topProductBox}>
              <Ionicons name="trophy-outline" size={18} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.topProductLabel}>Más vendido ({RANGE_UNIT_LABEL[range]})</Text>
                <Text style={s.topProductName} numberOfLines={1}>{balance.topProduct.name}</Text>
              </View>
              <Text style={s.topProductQty}>{balance.topProduct.unitsSold} u.</Text>
            </View>
          )}

          <View style={s.metricsGrid}>
            <BalCard theme={theme} onPress={() => setInfoKey('products')} label="Productos" value={products.length} color={theme.primary} icon="cube-outline" isCurrency={false} />
            <BalCard theme={theme} onPress={() => setInfoKey('unitsSold')} label={`Vendidos (${RANGE_UNIT_LABEL[range]})`} value={balance?.unitsSold} color="#3B82F6" icon="cart-outline" isCurrency={false} />
            <BalCard theme={theme} onPress={() => setInfoKey('income')} label="Ingresos" value={balance?.totalIncome} color={theme.success} icon="trending-up-outline" />
            <BalCard theme={theme} onPress={() => setInfoKey('expense')} label="Egresos" value={balance?.totalExpense} color={theme.danger} icon="trending-down-outline" />
            <BalCard theme={theme} onPress={() => setInfoKey('balance')} label="Balance" value={balance?.balance} color={(balance?.balance ?? 0) >= 0 ? theme.success : theme.danger} icon="wallet-outline" />
            <BalCard theme={theme} onPress={() => setInfoKey('margin')} label="Margen de ventas" value={balance?.salesMargin} color={(balance?.salesMargin ?? 0) >= 0 ? theme.success : theme.danger} icon="pricetags-outline" />
          </View>
        </View>

        {lowStock.length > 0 && (
          <Card style={s.alertCard}>
            <View style={s.alertHeader}>
              <Ionicons name="warning-outline" size={18} color={theme.warning} />
              <Text style={s.alertTitle}>Stock bajo — {lowStock.length} producto{lowStock.length > 1 ? 's' : ''}</Text>
            </View>
            {lowStock.slice(0, 3).map((p) => (
              <View key={p.id} style={s.alertRow}>
                <Text style={s.alertName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.alertQty}>{getStockFor(p.id)} u.</Text>
              </View>
            ))}
          </Card>
        )}

        {byCategory.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Gastos por categoría</Text>
            {byCategory.slice(0, 4).map((c) => (
              <Card key={c.category} style={s.catRow}>
                <Text style={s.catName} numberOfLines={1}>{c.category}</Text>
                <Text style={s.catValue}>{fmt(c.total)}</Text>
              </Card>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Accesos rápidos</Text>
          <View style={s.quickRow}>
            <Quick theme={theme} icon="cube-outline"       label="Ver productos"   onPress={() => router.navigate('/products')} />
            <Quick theme={theme} icon="cash-outline"       label="Registrar venta" onPress={() => router.push('/(app)/sales/create')} />
            <Quick theme={theme} icon="add-circle-outline" label="Nuevo producto"  onPress={() => router.push('/(app)/products/create')} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!infoKey} transparent animationType="fade" onRequestClose={() => setInfoKey(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setInfoKey(null)}>
          <TouchableOpacity activeOpacity={1} style={s.modalCard}>
            {infoKey && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{METRIC_INFO[infoKey].title}</Text>
                  <TouchableOpacity onPress={() => setInfoKey(null)}>
                    <Ionicons name="close" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={s.modalDescription}>{METRIC_INFO[infoKey].description}</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function BalCard({ label, value, color, icon, isCurrency = true, onPress, theme }) {
  const s = makeStyles(theme);
  return (
    <TouchableOpacity style={s.metricCard} onPress={onPress} activeOpacity={0.7}>
      <View style={s.metricHeader}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={s.metricLabel} numberOfLines={1}>{label}</Text>
        <Ionicons name="information-circle-outline" size={14} color={theme.textDisabled} style={{ marginLeft: 'auto' }} />
      </View>
      <Text style={[s.metricValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {isCurrency ? fmt(value) : (value ?? 0)}
      </Text>
    </TouchableOpacity>
  );
}

function Quick({ icon, label, onPress, theme }) {
  const s = makeStyles(theme);
  return (
    <TouchableOpacity onPress={onPress} style={s.quickBtn} activeOpacity={0.7}>
      <View style={s.quickIcon}><Ionicons name={icon} size={26} color={theme.primary} /></View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: theme.background },
  scroll:      { padding: SPACING.lg, paddingBottom: SPACING.xl },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  greeting:    { fontSize: FONT.xl, fontWeight: '700', color: theme.textPrimary },
  date:        { fontSize: FONT.sm, color: theme.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  iconBtn:     { padding: SPACING.sm, backgroundColor: theme.cardBackground, borderRadius: RADIUS.md, borderWidth: 1, borderColor: theme.border },

  // --- NUEVOS ESTILOS PARA EL LOADING OVERLAY ---
  fullScreenLoading: {
    flex: 1, // Toma todo el espacio de la pantalla nativa
    backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: theme.cardBackground,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT.sm,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  // ----------------------------------------------

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md, borderRadius: RADIUS.md, borderLeftWidth: 4 },
  alertBannerText: { flex: 1, fontSize: FONT.sm, fontWeight: '600' },

  filtersCard: { backgroundColor: theme.cardBackground, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1, borderColor: theme.border },
  filtersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  filtersTitle: { fontSize: FONT.lg, fontWeight: '700', color: theme.textPrimary },
  resetBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetBtnText:{ fontSize: FONT.xs, color: theme.primary, fontWeight: '600' },
  rangeRow:    { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  rangeChip:   { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.cardBackground },
  rangeChipActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
  rangeChipText: { fontSize: FONT.xs, color: theme.textSecondary, fontWeight: '600' },
  rangeChipTextActive: { color: theme.primary },
  hourSelectors: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  hourGroup:    { flex: 1, alignItems: 'center' },
  hourGroupLabel: { fontSize: FONT.xs, color: theme.textSecondary, marginBottom: 4 },
  hourControls:{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: RADIUS.md, padding: 4 },
  hourBtn:     { padding: 6, backgroundColor: theme.cardBackground, borderRadius: RADIUS.sm },
  hourText:    { fontSize: FONT.xs, fontWeight: '600', paddingHorizontal: 10, color: theme.textPrimary },

  chartCard:   { padding: SPACING.sm, marginBottom: SPACING.md, backgroundColor: theme.cardBackground },
  rectRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  rectCol:     { alignItems: 'center', width: 44 },
  rectValue:   { fontSize: FONT.xs, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  rectTrack:   { width: 28, height: 120, borderRadius: RADIUS.sm, backgroundColor: theme.background, justifyContent: 'flex-end', overflow: 'hidden' },
  rectFill:    { width: '100%', borderRadius: RADIUS.sm },
  rectLabel:   { fontSize: 10, color: theme.textSecondary, marginTop: 6 },
  emptyChart:  { height: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText: { fontSize: FONT.sm, color: theme.textDisabled },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  metricCard:  { width: '48%', padding: SPACING.md, backgroundColor: theme.cardBackground, borderRadius: RADIUS.md, borderWidth: 1, borderColor: theme.border },
  metricHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricLabel: { fontSize: FONT.xs, color: theme.textSecondary, fontWeight: '500', flexShrink: 1 },
  metricValue: { fontSize: FONT.xl, fontWeight: '700' },

  topProductBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: theme.primaryLight, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: 15 },
  topProductLabel: { fontSize: FONT.xs, color: theme.textSecondary },
  topProductName:  { fontSize: FONT.md, fontWeight: '700', color: theme.textPrimary },
  topProductQty:   { fontSize: FONT.lg, fontWeight: '700', color: theme.primary },

  alertCard:   { marginBottom: SPACING.lg, borderLeftWidth: 3, borderLeftColor: theme.warning, backgroundColor: theme.cardBackground },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  alertTitle:  { fontSize: FONT.md, fontWeight: '600', color: theme.textPrimary },
  alertRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  alertName:   { fontSize: FONT.sm, color: theme.textPrimary, flex: 1 },
  alertQty:    { fontSize: FONT.sm, fontWeight: '700', color: theme.warning },
  section:     { marginBottom: SPACING.lg },
  sectionTitle:{ fontSize: FONT.lg, fontWeight: '700', color: theme.textPrimary, marginBottom: SPACING.sm },
  catRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs, backgroundColor: theme.cardBackground },
  catName:     { fontSize: FONT.md, color: theme.textPrimary, flex: 1 },
  catValue:    { fontSize: FONT.md, fontWeight: '600', color: theme.textPrimary },
  quickRow:    { flexDirection: 'row', gap: SPACING.sm },
  quickBtn:    { flex: 1, backgroundColor: theme.cardBackground, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  quickIcon:   { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  quickLabel:  { fontSize: FONT.sm, color: theme.textPrimary, fontWeight: '600', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalCard: { backgroundColor: theme.cardBackground, borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 360 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  modalTitle: { fontSize: FONT.lg, fontWeight: '700', color: theme.textPrimary },
  modalDescription: { fontSize: FONT.sm, color: theme.textSecondary, lineHeight: 20 },
});
