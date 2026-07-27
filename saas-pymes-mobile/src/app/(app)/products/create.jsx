import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../../store/productStore.js';
import { Input }  from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { COLORS, SPACING, FONT, RADIUS } from '../../../constants/index.js';

const UNITS = ['unit', 'kg', 'liter', 'box', 'pack'];
const UNIT_LABELS = { unit: 'Unidad', kg: 'Kg', liter: 'Litro', box: 'Caja', pack: 'Pack' };

export default function CreateProductScreen() {
  const [form, setForm]       = useState({ sku: '', name: '', cost: '', price: '', unit: 'unit', description: '' });
  const [stockInicial, setStockInicial] = useState('');
  const [errors, setErrors]   = useState({});
  const { createProduct, registerMovement, isCreating } = useProductStore();

  const upd = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const cost   = parseFloat(form.cost)  || 0;
  const price  = parseFloat(form.price) || 0;
  const margin = cost > 0 && price >= cost
    ? (((price - cost) / price) * 100).toFixed(1)
    : null;

  const validate = () => {
    const e = {};
    if (!form.sku.trim())          e.sku   = 'El SKU es obligatorio';
    if (!form.name.trim())         e.name  = 'El nombre es obligatorio';
    if (cost <= 0)                 e.cost  = 'Debe ser mayor a 0';
    if (price <= 0)                e.price = 'Debe ser mayor a 0';
    if (price > 0 && price < cost) e.price = 'No puede ser menor al costo';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      const product = await createProduct({ ...form, cost, price });

      // Si ingresó stock inicial, registrar el movimiento usando el STORE
      const qty = parseFloat(stockInicial);
      if (qty > 0) {
        try {
          await registerMovement({
            productId: product.id,
            quantity:  qty,
            type:      'entrada', // <-- Cambiado de 'IN' a 'entrada'
            price:     cost       // Opcional, pero bueno para cálculos de inventario
          });
        } catch (stockErr) {
          // El producto se creó bien, solo falló el stock
          console.warn('Stock inicial no registrado:', stockErr.message);
        }
      }

      Alert.alert(
        '✓ Producto creado',
        qty > 0
          ? `${product.name} creado con ${qty} unidades de stock inicial.`
          : `${product.name} fue agregado al inventario.`,
        [
          { text: 'Crear otro', onPress: () => {
            setForm({ sku: '', name: '', cost: '', price: '', unit: 'unit', description: '' });
            setStockInicial('');
          }},
          { text: 'Ver productos', onPress: () => router.push('/products') },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={s.title}>Nuevo producto</Text>
            <View style={{ width: 22 }} />
          </View>

          <Input label="SKU *" placeholder="PROD-001" value={form.sku}
            onChangeText={upd('sku')} error={errors.sku} autoCapitalize="characters" />

          <Input label="Nombre *" placeholder="Harina 1kg" value={form.name}
            onChangeText={upd('name')} error={errors.name} />

          <Input label="Descripción (opcional)" placeholder="Detalle adicional..."
            value={form.description} onChangeText={upd('description')}
            multiline numberOfLines={2} />

          {/* Costo y Precio */}
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <Input label="Costo *" placeholder="0" value={form.cost}
              onChangeText={upd('cost')} error={errors.cost}
              keyboardType="numeric" style={{ flex: 1 }} />
            <Input label="Precio venta *" placeholder="0" value={form.price}
              onChangeText={upd('price')} error={errors.price}
              keyboardType="numeric" style={{ flex: 1 }} />
          </View>

          {/* Margen en tiempo real */}
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

          {/* Unidad de medida */}
          <Text style={s.unitLabel}>Unidad de medida</Text>
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

          {/* Stock inicial */}
          <View style={s.stockSection}>
            <View style={s.stockHeader}>
              <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
              <Text style={s.stockTitle}>Stock inicial (opcional)</Text>
            </View>
            <Text style={s.stockDesc}>
              Si ya tienes unidades de este producto, ingrésalas aquí.
            </Text>
            <Input
              placeholder="0"
              value={stockInicial}
              onChangeText={setStockInicial}
              keyboardType="numeric"
              style={{ marginBottom: 0 }}
            />
          </View>

          <Button
            title="Crear producto"
            onPress={handleCreate}
            loading={isCreating}
            style={{ marginTop: SPACING.md }}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  scroll:       { padding: SPACING.lg, paddingBottom: SPACING.xl },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  title:        { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary },
  marginBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, padding: SPACING.sm, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  unitLabel:    { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  unitRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  chip:         { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipActive:   { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText:     { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive:{ color: COLORS.primary, fontWeight: '700' },
  stockSection: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  stockHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.xs },
  stockTitle:   { fontSize: FONT.md, fontWeight: '600', color: COLORS.primary },
  stockDesc:    { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
});
