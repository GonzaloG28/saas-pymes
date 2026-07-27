import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../../store/productStore.js';
import { Card } from '../../../components/ui/Card.jsx';
import { COLORS, SPACING, FONT, RADIUS } from '../../../constants/index.js';

const fmt = (n) => n == null ? '—' : `$${Number(n).toLocaleString('es-CL')}`;

export default function ProductsScreen() {
  // 1. Añadimos getStockFor al destructuring
  const { products, meta, stockMap, isLoading, fetchProducts, fetchStockSnapshot, getStockFor } = useProductStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchStockSnapshot();
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => fetchProducts({ page: 1, search: query }), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (products.length > 0) {
      //console.log('Producto:', JSON.stringify(products[0], null, 2));
    }
  }, [products]);

  const renderProduct = useCallback(({ item: p }) => {
    const stock = getStockFor(p.id);
    const stockColor = stock < 5 ? COLORS.danger : stock < 15 ? COLORS.warning : COLORS.success;
    
    return (
      <TouchableOpacity
        key={p.id}
        onPress={() => router.push(`/products/${p.id}`)}
        activeOpacity={0.7}
      >
      <Card style={s.card}>
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{p.name}</Text>
            <Text style={s.sku}>SKU: {p.sku}</Text>
          </View>
          <View style={[s.stockBadge, { backgroundColor: stockColor + '20' }]}>
            <Text style={[s.stockText, { color: stockColor }]}>{stock} u.</Text>
          </View>
        </View>
        <View style={s.cardBottom}>
          <PriceCol label="Costo"   value={fmt(p.cost)} />
          <PriceCol label="Precio"  value={fmt(p.price)} />
          <PriceCol label="Margen"  value={`${p.grossMarginPct ?? 0}%`} valueColor={COLORS.success} />
        </View>
      </Card>
      </TouchableOpacity>
    );
  }, [stockMap]); // Dependencia necesaria para que actualice la UI al mutar el stock

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Productos</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/products/create')} style={s.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
        <TextInput style={s.searchInput} placeholder="Buscar por nombre o SKU..."
          placeholderTextColor={COLORS.textDisabled} value={query} onChangeText={setQuery} />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.counter}>{meta.total} producto{meta.total !== 1 ? 's' : ''}</Text>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchProducts({ page: 1, search: query })} tintColor={COLORS.primary} />}
        onEndReached={() => { if (meta.page < meta.totalPages) fetchProducts({ page: meta.page + 1, search: query }); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={!isLoading && (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textDisabled} />
            <Text style={s.emptyText}>{query ? 'Sin resultados' : 'Aún no hay productos'}</Text>
            {!query && <TouchableOpacity onPress={() => router.push('/(app)/products/create')} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>+ Crear primer producto</Text>
            </TouchableOpacity>}
          </View>
        )}
        ListFooterComponent={isLoading ? <ActivityIndicator color={COLORS.primary} style={{ padding: SPACING.md }} /> : null}
      />
    </SafeAreaView>
  );
}

function PriceCol({ label, value, valueColor }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={s.priceLabel}>{label}</Text>
      <Text style={[s.priceValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  title:       { fontSize: FONT.xxl, fontWeight: '700', color: COLORS.textPrimary },
  addBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.white, borderRadius: RADIUS.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, elevation: 1 },
  searchInput: { flex: 1, fontSize: FONT.md, color: COLORS.textPrimary },
  counter:     { fontSize: FONT.sm, color: COLORS.textSecondary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.xs },
  list:        { padding: SPACING.lg, paddingTop: 0, gap: SPACING.sm, paddingBottom: SPACING.xl },
  card:        { marginBottom: 0 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  name:        { fontSize: FONT.md, fontWeight: '600', color: COLORS.textPrimary },
  sku:         { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 2 },
  stockBadge:  { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  stockText:   { fontSize: FONT.sm, fontWeight: '700' },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  priceLabel:  { fontSize: FONT.sm, color: COLORS.textSecondary },
  priceValue:  { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },
  empty:       { alignItems: 'center', paddingTop: SPACING.xl, gap: SPACING.sm },
  emptyText:   { fontSize: FONT.md, color: COLORS.textSecondary },
  emptyBtn:    { marginTop: SPACING.sm, backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  emptyBtnText:{ color: COLORS.primary, fontWeight: '600' },
});
