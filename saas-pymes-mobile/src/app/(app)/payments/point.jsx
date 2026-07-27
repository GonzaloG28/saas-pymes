import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../../services/paymentService.js';
import { productService } from '../../../services/productService.js';
import { stockService } from '../../../services/stockService.js';
import { Input } from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { COLORS, SPACING, FONT, RADIUS } from '../../../constants/index.js';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;

export default function PointPaymentScreen() {
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [linking, setLinking] = useState(false);

  const [deviceId, setDeviceId] = useState('');
  const [label, setLabel] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(true);

  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [charging, setCharging] = useState(false);

  // Función para recargar tanto dispositivos como productos frescos
  const loadData = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const list = await paymentService.listDevices();
      setDevices(list.filter((d) => d.isActive));
    } catch {
      // silencioso
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // useFocusEffect para actualizar los datos cada vez que regresas a esta pantalla
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Carga productos SIEMPRE — con query vacío trae el listado por defecto (más recientes/todos),
  // y con texto filtra por nombre. Así el buscador nunca queda vacío al entrar a la pantalla.
  useEffect(() => {
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const result = await productService.list({ page: 1, limit: query.trim() ? 20 : 15, search: query.trim() || undefined });
        const withStock = await Promise.all(
          result.data.map(async (p) => {
            try {
              const stock = await stockService.getStock(p.id);
              return { ...p, stock };
            } catch { return { ...p, stock: 0 }; }
          })
        );
        setResults(withStock);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, query.trim() ? 400 : 0); // sin delay para la carga inicial
    return () => clearTimeout(t);
  }, [query]);

  const handleLinkDevice = async () => {
    if (!deviceId.trim()) return Alert.alert('Error', 'Ingresa el ID del dispositivo');
    if (!mpAccessToken.trim()) return Alert.alert('Error', 'Ingresa tu Access Token de Mercado Pago');

    setLinking(true);
    try {
      await paymentService.linkDevice({ deviceId: deviceId.trim(), label: label.trim(), mpAccessToken: mpAccessToken.trim() });
      setDeviceId(''); setLabel(''); setMpAccessToken('');
      setShowLinkForm(false);
      await loadData();
      Alert.alert('Listo', 'Terminal vinculada correctamente');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'No se pudo vincular la terminal');
    } finally {
      setLinking(false);
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.price }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) => prev
      .map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter((i) => i.quantity > 0));
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  const handleCreateOrder = async () => {
    if (cart.length === 0) return Alert.alert('Error', 'Agrega al menos un producto');
    try {
      const newOrder = await paymentService.createOrder(
        cart.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      );
      setOrder(newOrder);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'No se pudo crear la orden');
    }
  };

  const handleCharge = async () => {
    if (!order) return;
    setCharging(true);
    try {
      await paymentService.chargeOrder(order.id);
      Alert.alert(
        'Cobro enviado',
        'Se envió el cobro a tu terminal Point. Sigue las instrucciones en la máquina.',
        [{ text: 'OK', onPress: () => { setCart([]); setOrder(null); } }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'No se pudo iniciar el cobro');
    } finally {
      setCharging(false);
    }
  };

  const hasDevice = devices.length > 0;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Modal de Carga a Pantalla Completa */}
      <Modal visible={loadingDevices} transparent animationType="fade">
        <View style={s.fullScreenLoading}>
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingText}>Cargando terminales...</Text>
          </View>
        </View>
      </Modal>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Cobrar con Point</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <Card style={s.deviceCard}>
          {hasDevice ? (
            <View style={s.deviceRow}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={s.deviceLabel}>{devices[0].label || 'Terminal vinculada'}</Text>
                <Text style={s.deviceSub}>ID: {devices[0].deviceId}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLinkForm((v) => !v)} style={s.changeBtn}>
                <Ionicons name="swap-horizontal-outline" size={14} color={COLORS.primary} />
                <Text style={s.changeLink}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.deviceRow}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
              <Text style={{ flex: 1, fontSize: FONT.sm, color: COLORS.textSecondary }}>
                No tienes ninguna terminal Point vinculada
              </Text>
            </View>
          )}
        </Card>

        {(!hasDevice || showLinkForm) && (
          <Card style={s.linkForm}>
            <Text style={s.linkFormTitle}>{hasDevice ? 'Vincular otra terminal' : 'Vincular terminal'}</Text>
            {hasDevice && (
              <Text style={s.linkFormNote}>
                Al vincular una nueva terminal, "{devices[0].label || devices[0].deviceId}" quedará desactivada.
              </Text>
            )}
            <Input label="ID del dispositivo" placeholder="Ej: PAX_A910__SN12345"
              value={deviceId} onChangeText={setDeviceId} />
            <Input label="Nombre (opcional)" placeholder="Ej: Caja 1"
              value={label} onChangeText={setLabel} />
            <Input label="Tu Access Token de Mercado Pago" placeholder="APP_USR-... o TEST-..."
              value={mpAccessToken} onChangeText={setMpAccessToken} secureTextEntry />
            <Button title="Vincular" onPress={handleLinkDevice} loading={linking} />
          </Card>
        )}

        {!order && (
          <>
            <Text style={s.sectionTitle}>Productos</Text>
            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar por nombre..."
                placeholderTextColor={COLORS.textDisabled}
                value={query}
                onChangeText={setQuery}
              />
              {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
              {!!query && !searching && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {!searching && results.length > 0 && (
              <View style={s.resultsBox}>
                {results.map((p) => (
                  <TouchableOpacity key={p.id} style={s.productRow} onPress={() => addToCart(p)}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.productStock}>{p.stock} u. disponibles</Text>
                    </View>
                    <Text style={s.productPrice}>{fmt(p.price)}</Text>
                    <Ionicons name="add-circle" size={24} color={COLORS.primary} style={{ marginLeft: SPACING.sm }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!searching && query.length > 0 && results.length === 0 && (
              <Text style={s.noResults}>Sin resultados para "{query}"</Text>
            )}

            {!searching && !query.length && results.length === 0 && (
              <Text style={s.noResults}>No tienes productos registrados todavía</Text>
            )}

            {cart.length > 0 && (
              <Card style={s.cartCard}>
                <Text style={s.cartTitle}>Carrito</Text>
                {cart.map((item) => (
                  <View key={item.productId} style={s.cartRow}>
                    <Text style={s.cartItemName} numberOfLines={1}>{item.name}</Text>
                    <View style={s.qtyControls}>
                      <TouchableOpacity onPress={() => updateQty(item.productId, -1)} style={s.qtyBtn}>
                        <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={s.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQty(item.productId, 1)} style={s.qtyBtn}>
                        <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={s.cartItemTotal}>{fmt(item.unitPrice * item.quantity)}</Text>
                  </View>
                ))}
                <View style={s.cartTotalRow}>
                  <Text style={s.cartTotalLabel}>Total</Text>
                  <Text style={s.cartTotalValue}>{fmt(cartTotal)}</Text>
                </View>
                <Button title="Crear orden" onPress={handleCreateOrder} disabled={!hasDevice} />
                {!hasDevice && <Text style={s.warnText}>Vincula una terminal para poder cobrar</Text>}
              </Card>
            )}
          </>
        )}

        {order && (
          <Card style={s.orderCard}>
            <Ionicons name="receipt-outline" size={28} color={COLORS.primary} />
            <Text style={s.orderTitle}>Orden creada</Text>
            <Text style={s.orderTotal}>{fmt(order.totalAmount)}</Text>
            <Text style={s.orderSub}>Presiona cobrar para enviar el monto a tu terminal Point</Text>
            <Button title="Cobrar con Point" onPress={handleCharge} loading={charging} />
            <TouchableOpacity onPress={() => setOrder(null)} style={{ marginTop: SPACING.sm }}>
              <Text style={s.cancelLink}>Cancelar y volver al carrito</Text>
            </TouchableOpacity>
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title:  { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xl },

  // Estilos del Modal de carga a pantalla completa
  fullScreenLoading: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: COLORS.white,
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
    color: COLORS.textPrimary,
  },

  deviceCard: { marginBottom: SPACING.md, padding: SPACING.md },
  deviceRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  deviceLabel:{ fontSize: FONT.md, fontWeight: '600', color: COLORS.textPrimary },
  deviceSub:  { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  changeBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeLink: { fontSize: FONT.sm, color: COLORS.primary, fontWeight: '600' },

  linkForm: { marginBottom: SPACING.md, padding: SPACING.md },
  linkFormTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  linkFormNote: { fontSize: FONT.xs, color: COLORS.warning, marginBottom: SPACING.sm },

  sectionTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  searchInput: { flex: 1, fontSize: FONT.md, color: COLORS.textPrimary },
  resultsBox: { marginBottom: SPACING.sm },
  noResults: { fontSize: FONT.sm, color: COLORS.textSecondary, textAlign: 'center', marginVertical: SPACING.md },

  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  productName: { fontSize: FONT.md, fontWeight: '600', color: COLORS.textPrimary },
  productStock: { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  productPrice: { fontSize: FONT.md, fontWeight: '700', color: COLORS.primary },

  cartCard: { marginTop: SPACING.md, padding: SPACING.md },
  cartTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: SPACING.sm },
  cartItemName: { flex: 1, fontSize: FONT.sm, color: COLORS.textPrimary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: FONT.sm, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textPrimary, minWidth: 60, textAlign: 'right' },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm, marginBottom: SPACING.md },
  cartTotalLabel: { fontSize: FONT.md, color: COLORS.textSecondary },
  cartTotalValue: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.primary },
  warnText: { fontSize: FONT.xs, color: COLORS.warning, textAlign: 'center', marginTop: SPACING.xs },

  orderCard: { alignItems: 'center', padding: SPACING.lg, gap: SPACING.xs },
  orderTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.xs },
  orderTotal: { fontSize: FONT.xxl, fontWeight: '700', color: COLORS.primary },
  orderSub: { fontSize: FONT.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md },
  cancelLink: { fontSize: FONT.sm, color: COLORS.textSecondary, textDecorationLine: 'underline' },
});