// src/app/(app)/products/[id].jsx
// Pantalla de detalle y edición de producto

import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from 'expo-router'; 
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { productService } from '../../../services/productService.js';
import { stockService } from '../../../services/stockService.js';
import { salesService } from '../../../services/salesService.js';
import { Input }  from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card }   from '../../../components/ui/Card.jsx';
import { COLORS, SPACING, FONT, RADIUS } from '../../../constants/index.js';

const UNITS = ['unit', 'kg', 'liter', 'box', 'pack'];
const UNIT_LABELS = { unit: 'Unidad', kg: 'Kg', liter: 'Litro', box: 'Caja', pack: 'Pack' };
const fmt = (n) => n == null ? '—' : `$${Number(n).toLocaleString('es-CL')}`;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();

  const [product,   setProduct]   = useState(null);
  const [stock,     setStock]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [tab,       setTab]       = useState('info'); // 'info' | 'stock'
  const [form,      setForm]      = useState({});
  const [errors,    setErrors]    = useState({});
  const [movQty,    setMovQty]    = useState('');
  const [movType,   setMovType]   = useState('IN');
  const [movNote,   setMovNote]   = useState('');
  const [movLoading, setMovLoading] = useState(false);

  const [soldQty, setSoldQty]       = useState(0);
  const [salesStats, setSalesStats] = useState(null);
  const [exporting, setExporting]   = useState(false);

  useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    loadProduct();
    loadSalesStats();
  });
  return unsubscribe;
}, [navigation, id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const [prod, currentStock] = await Promise.all([
        productService.getById(id),
        stockService.getStock(id),
      ]);
      setProduct(prod);
      setStock(currentStock);
      setForm({
        name:        prod.name,
        cost:        String(prod.cost),
        price:       String(prod.price),
        unit:        prod.unit,
        description: prod.description ?? '',
      });
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el producto');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadSalesStats = async () => {
  try {
    const stats = await salesService.getProductStats(id);
    setSoldQty(stats.totalSold);
    setSalesStats(stats);
  } catch (err) {
    console.warn('No se pudieron cargar stats de ventas:', err.message);
  }
};

  const upd = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const cost   = parseFloat(form.cost)  || 0;
  const price  = parseFloat(form.price) || 0;
  const margin = cost > 0 && price >= cost
    ? (((price - cost) / price) * 100).toFixed(1)
    : null;

  const handleSave = async () => {
    const e = {};
    if (!form.name?.trim())        e.name  = 'Obligatorio';
    if (cost <= 0)                 e.cost  = 'Debe ser mayor a 0';
    if (price <= 0)                e.price = 'Debe ser mayor a 0';
    if (price > 0 && price < cost) e.price = 'No puede ser menor al costo';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const updated = await productService.update(id, { ...form, cost, price });
      setProduct(updated);
      Alert.alert('Guardado', 'Producto actualizado correctamente');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMovement = async () => {
  const qty = parseFloat(movQty);
  if (!qty || qty <= 0) return Alert.alert('Error', 'Ingresa una cantidad válida');

  setMovLoading(true);
  try {
    await stockService.registerMovement({ productId: id, quantity: qty, type: movType, note: movNote || undefined });

    // Actualización optimista inmediata, sin esperar otro round-trip
    const delta = movType === 'IN' ? qty : -qty;
    setStock((prev) => prev + delta);

    setMovQty('');
    setMovNote('');
    Alert.alert('Movimiento registrado', `Stock actualizado: ${stock + delta} unidades`);
    loadSalesStats();

    // Sincroniza en segundo plano por si el servidor calculó distinto (no bloquea la UI)
    stockService.getStock(id).then(setStock).catch(() => {});
  } catch (err) {
    Alert.alert('Error', err.response?.data?.message ?? err.message);
  } finally {
    setMovLoading(false);
  }
};

  const handleDeactivate = () => {
    Alert.alert(
      'Desactivar producto',
      '¿Estás seguro? El producto no aparecerá en el inventario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: async () => {
          try {
            await productService.deactivate(id);
            Alert.alert('Producto desactivado', '', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message ?? err.message);
          }
        }},
      ]
    );
  };

  // ── Exportar PDF ────────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!product) return;
    setExporting(true);
    try {
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #1a1a1a; }
              h1 { font-size: 20px; margin-bottom: 4px; }
              .sku { color: #666; font-size: 13px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
              td, th { padding: 8px 10px; border-bottom: 1px solid #e5e5e5; text-align: left; font-size: 13px; }
              th { background: #f5f5f5; font-weight: 600; }
              .section-title { font-size: 15px; font-weight: 700; margin: 20px 0 8px; }
              .footer { margin-top: 30px; font-size: 11px; color: #999; }
            </style>
          </head>
          <body>
            <h1>${product.name}</h1>
            <div class="sku">SKU: ${product.sku}</div>

            <div class="section-title">Resumen</div>
            <table>
              <tr><th>Costo</th><th>Precio</th><th>Margen</th><th>Stock actual</th></tr>
              <tr>
                <td>${fmt(product.cost)}</td>
                <td>${fmt(product.price)}</td>
                <td>${product.grossMarginPct ?? 0}%</td>
                <td>${stock} unidades</td>
              </tr>
            </table>

            <div class="section-title">Ventas</div>
            <table>
              <tr><th>Hoy</th><th>Este mes</th><th>Este año</th><th>Total histórico</th></tr>
              <tr>
                <td>${salesStats?.today ?? 0}</td>
                <td>${salesStats?.month ?? 0}</td>
                <td>${salesStats?.year ?? 0}</td>
                <td>${soldQty}</td>
              </tr>
            </table>

            <div class="footer">Generado el ${new Date().toLocaleString('es-CL')}</div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${product.name} - Reporte` });
      } else {
        Alert.alert('PDF generado', uri);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setExporting(false);
    }
  };

  // ── Exportar Excel/CSV ───────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    if (!product) return;
    setExporting(true);
    try {
      const rows = [
        ['Producto', product.name],
        ['SKU', product.sku],
        ['Costo', product.cost],
        ['Precio', product.price],
        ['Margen %', product.grossMarginPct ?? 0],
        ['Stock actual', stock],
        [],
        ['Periodo', 'Cantidad vendida'],
        ['Hoy', salesStats?.today ?? 0],
        ['Este mes', salesStats?.month ?? 0],
        ['Este año', salesStats?.year ?? 0],
        ['Total histórico', soldQty],
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

      const fileName = `${product.sku}_reporte.csv`;
      const fileUri  = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: `${product.name} - Excel` });
      } else {
        Alert.alert('CSV generado', fileUri);
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el archivo');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.textSecondary }}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stockColor = stock < 5 ? COLORS.danger : stock < 15 ? COLORS.warning : COLORS.success;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>{product?.name}</Text>
          <TouchableOpacity onPress={handleDeactivate}>
            <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* Stock badge */}
        <View style={[s.stockBanner, { backgroundColor: stockColor + '15', borderColor: stockColor }]}>
          <Ionicons name="cube-outline" size={20} color={stockColor} />
          <Text style={[s.stockNum, { color: stockColor }]}>{stock}</Text>
          <Text style={[s.stockLabel, { color: stockColor }]}>
            unidades en stock {stock < 5 ? '— Stock bajo' : ''}
          </Text>
        </View>

        {/* Botones de exportación */}
        <View style={s.exportRow}>
          <TouchableOpacity style={s.exportBtn} onPress={handleExportPdf} disabled={exporting}>
            <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
            <Text style={s.exportBtnText}>Exportar PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.exportBtn} onPress={handleExportCsv} disabled={exporting}>
            <Ionicons name="grid-outline" size={16} color={COLORS.primary} />
            <Text style={s.exportBtnText}>Exportar Excel</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, tab === 'info' && s.tabActive]}
            onPress={() => setTab('info')}>
            <Text style={[s.tabText, tab === 'info' && s.tabTextActive]}>Información</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === 'stock' && s.tabActive]}
            onPress={() => setTab('stock')}>
            <Text style={[s.tabText, tab === 'stock' && s.tabTextActive]}>Movimiento de stock</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Tab: Información ── */}
          {tab === 'info' && (
            <View>
              {/* Resumen de precios */}
              <View style={s.priceRow}>
                <Card style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={s.priceLabel}>Costo</Text>
                  <Text style={s.priceValue}>{fmt(product?.cost)}</Text>
                </Card>
                <Card style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={s.priceLabel}>Precio</Text>
                  <Text style={s.priceValue}>{fmt(product?.price)}</Text>
                </Card>
                <Card style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={s.priceLabel}>Margen</Text>
                  <Text style={[s.priceValue, { color: COLORS.success }]}>
                    {product?.grossMarginPct ?? 0}%
                  </Text>
                </Card>
              </View>

              {/* Ventas por periodo */}
              {salesStats && (
                <View style={s.statsRow}>
                  <Card style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.priceLabel}>Hoy</Text>
                    <Text style={s.priceValue}>{salesStats.today}</Text>
                  </Card>
                  <Card style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.priceLabel}>Este mes</Text>
                    <Text style={s.priceValue}>{salesStats.month}</Text>
                  </Card>
                  <Card style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.priceLabel}>Este año</Text>
                    <Text style={s.priceValue}>{salesStats.year}</Text>
                  </Card>
                </View>
              )}

              {/* Formulario edición */}
              <Input label="Nombre" value={form.name}
                onChangeText={upd('name')} error={errors.name} />

              <Input label="Descripción" value={form.description}
                onChangeText={upd('description')} multiline numberOfLines={2} />

              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <Input label="Costo" value={form.cost}
                  onChangeText={upd('cost')} error={errors.cost}
                  keyboardType="numeric" style={{ flex: 1 }} />
                <Input label="Precio venta" value={form.price}
                  onChangeText={upd('price')} error={errors.price}
                  keyboardType="numeric" style={{ flex: 1 }} />
              </View>

              {margin !== null && (
                <View style={[s.marginBox, { backgroundColor: parseFloat(margin) > 20 ? COLORS.successLight : COLORS.warningLight }]}>
                  <Ionicons name="analytics-outline" size={16}
                    color={parseFloat(margin) > 20 ? COLORS.success : COLORS.warning} />
                  <Text style={{ fontSize: FONT.sm, fontWeight: '600',
                    color: parseFloat(margin) > 20 ? '#065F46' : '#92400E' }}>
                    Margen bruto: {margin}%
                  </Text>
                </View>
              )}

              <Text style={s.unitLabel}>Unidad</Text>
              <View style={s.unitRow}>
                {UNITS.map((u) => (
                  <TouchableOpacity key={u}
                    onPress={() => setForm((f) => ({ ...f, unit: u }))}
                    style={[s.chip, form.unit === u && s.chipActive]}>
                    <Text style={[s.chipText, form.unit === u && s.chipTextActive]}>
                      {UNIT_LABELS[u]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button title="Guardar cambios" onPress={handleSave} loading={saving} />
            </View>
          )}

          {/* ── Tab: Stock ── */}
          {tab === 'stock' && (
            <View>
              <Text style={s.movTitle}>Registrar movimiento</Text>

              <Text style={s.unitLabel}>Tipo</Text>
              <View style={s.unitRow}>
                {[
                  { key: 'IN',  label: 'Entrada', icon: 'arrow-down-circle-outline', color: COLORS.success },
                  { key: 'OUT', label: 'Salida',  icon: 'arrow-up-circle-outline',   color: COLORS.danger  },
                ].map((t) => (
                  <TouchableOpacity key={t.key}
                    onPress={() => setMovType(t.key)}
                    style={[s.movChip, movType === t.key && { borderColor: t.color, backgroundColor: t.color + '15' }]}>
                    <Ionicons name={t.icon} size={16} color={movType === t.key ? t.color : COLORS.textSecondary} />
                    <Text style={[s.movChipText, movType === t.key && { color: t.color, fontWeight: '700' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Cantidad"
                placeholder="0"
                value={movQty}
                onChangeText={setMovQty}
                keyboardType="numeric"
              />

              <Input
                label="Nota (opcional)"
                placeholder="Ej: Compra proveedor X, factura #123"
                value={movNote}
                onChangeText={setMovNote}
                multiline
              />

              <Button title="Registrar movimiento" onPress={handleMovement} loading={movLoading} />

              {/* Cantidad vendida */}
              <View style={s.soldBox}>
                <Ionicons name="cart-outline" size={16} color={COLORS.primary} />
                <Text style={s.soldText}>{soldQty} unidades vendidas en total</Text>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title:        { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  stockBanner:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  stockNum:     { fontSize: FONT.xxl, fontWeight: '700' },
  stockLabel:   { fontSize: FONT.sm, fontWeight: '500' },
  exportRow:    { flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  exportBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  exportBtnText:{ fontSize: FONT.sm, fontWeight: '600', color: COLORS.primary },
  tabs:         { flexDirection: 'row', marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.border, borderRadius: RADIUS.md, padding: 3 },
  tab:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  tabActive:    { backgroundColor: COLORS.white },
  tabText:      { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive:{ color: COLORS.textPrimary, fontWeight: '700' },
  scroll:       { padding: SPACING.lg, paddingBottom: SPACING.xl },
  priceRow:     { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statsRow:     { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  priceLabel:   { fontSize: FONT.sm, color: COLORS.textSecondary },
  priceValue:   { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary },
  marginBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, padding: SPACING.sm, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  unitLabel:    { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  unitRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  chip:         { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipActive:   { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText:     { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive:{ color: COLORS.primary, fontWeight: '700' },
  movTitle:     { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  movChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  movChipText:  { fontSize: FONT.sm, color: COLORS.textSecondary },
  soldBox:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.lg, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight },
  soldText:     { fontSize: FONT.sm, fontWeight: '600', color: COLORS.primary },
  info:         { fontSize: FONT.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
});
