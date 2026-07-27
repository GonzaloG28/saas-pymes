import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../../store/productStore.js';
import { salesService } from '../../../services/salesService.js';
import { Input }  from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card }   from '../../../components/ui/Card.jsx';
import { COLORS, SPACING, FONT, RADIUS } from '../../../constants/index.js';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;

const PAYMENT_METHODS = [
  { key: 'cash',     label: 'Efectivo',      icon: 'cash-outline' },
  { key: 'transfer', label: 'Transferencia', icon: 'swap-horizontal-outline' },
];

export default function CreateSaleScreen() {
  const { products, getStockFor } = useProductStore();
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const pick = (p) => {
    setSelected(p);
    setUnitPrice(String(p.price));
  };

  const qty   = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total  = qty * price;
  const profit = selected ? (price - selected.cost) * qty : 0;
  const stock  = selected ? getStockFor(selected.id) : 0;

  const handleSell = async () => {
    if (!selected) return Alert.alert('Error', 'Selecciona un producto');
    if (qty <= 0) return Alert.alert('Error', 'Cantidad inválida');
    if (qty > stock) return Alert.alert('Error', `Stock insuficiente (disponible: ${stock})`);

    setSaving(true);
    try {
      const result = await salesService.registerSale({
        productId: selected.id,
        quantity: qty,
        unitPrice: price,
        note,
        paymentMethod,
      });
      Alert.alert('Venta registrada', `Ganancia: ${fmt(result.profit)}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Registrar venta</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.label}>Productos</Text>
        <FlatList
          horizontal
          data={products}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.md }}
          renderItem={({ item: p }) => (
            <TouchableOpacity onPress={() => pick(p)} style={[s.prodChip, selected?.id === p.id && s.prodChipActive]}>
              <Text style={[s.prodChipText, selected?.id === p.id && s.prodChipTextActive]} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={s.prodChipStock}>{getStockFor(p.id)} u.</Text>
            </TouchableOpacity>
          )}
        />

        {selected && (
          <>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <Input label={`Cantidad (stock: ${stock})`} value={quantity}
                onChangeText={setQuantity} keyboardType="numeric" style={{ flex: 1 }} />
              <Input label="Precio unitario" value={unitPrice}
                onChangeText={setUnitPrice} keyboardType="numeric" style={{ flex: 1 }} />
            </View>

            <Text style={s.label}>Método de pago</Text>
            <View style={s.methodRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setPaymentMethod(m.key)}
                  style={[s.methodChip, paymentMethod === m.key && s.methodChipActive]}
                >
                  <Ionicons name={m.icon} size={16} color={paymentMethod === m.key ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[s.methodChipText, paymentMethod === m.key && s.methodChipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="Nota (opcional)" value={note} onChangeText={setNote} />

            <Card style={s.summary}>
              <SummaryRow label="Total venta" value={fmt(total)} />
              <SummaryRow label="Ganancia estimada" value={fmt(profit)}
                color={profit >= 0 ? COLORS.success : COLORS.danger} />
            </Card>

            <Button title="Confirmar venta" onPress={handleSell} loading={saving} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, color && { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title:   { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary },
  scroll:  { padding: SPACING.lg, paddingBottom: SPACING.xl },
  label:   { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  prodChip:     { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, minWidth: 110 },
  prodChipActive:{ borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  prodChipText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary },
  prodChipTextActive: { color: COLORS.primary },
  prodChipStock:{ fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  methodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  methodChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  methodChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  methodChipText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textSecondary },
  methodChipTextActive: { color: COLORS.primary },
  summary: { marginVertical: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: FONT.md, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },
});