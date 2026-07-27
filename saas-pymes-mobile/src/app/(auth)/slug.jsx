// app/(auth)/slug.jsx  — Paso 1: ingresar nombre de empresa

import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore.js';
import { Input }  from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { COLORS, SPACING, FONT, RADIUS } from '../../constants/index.js';

export default function SlugScreen() {
  const [slug,    setSlug]   = useState('');
  const [loading, setLoad]   = useState(false);
  const [error,   setError]  = useState('');
  const resolveSlug = useAuthStore((s) => s.resolveSlug);

  const handleContinue = async () => {
    if (!slug.trim()) return setError('Escribe el nombre de tu empresa');
    setLoad(true); setError('');
    try {
      const tenant = await resolveSlug(slug.trim());
      // Pasar el tenant como parámetro a la siguiente pantalla
      router.push({ pathname: '/(auth)/login', params: { tenantId: tenant.id, tenantName: tenant.name } });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Empresa no encontrada');
    } finally { setLoad(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.header}>
            <View style={s.brandBar} />
            <Text style={s.title}>Inventario</Text>
            <Text style={s.sub}>Control simple para tu negocio</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Acceder a tu empresa</Text>
            <Text style={s.cardDesc}>
              Escribe el identificador de tu empresa.{'\n'}
              Ejemplo: <Text style={{ color: COLORS.primary, fontWeight: '600' }}>ferreteria-lopez</Text>
            </Text>

            <Input
              label="Nombre de empresa"
              placeholder="mi-empresa"
              value={slug}
              onChangeText={(v) => { setSlug(v); setError(''); }}
              error={error}
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleContinue}
            />

            <Button title="Continuar" onPress={handleContinue} loading={loading} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: COLORS.background },
  scroll:   { flexGrow: 1, padding: SPACING.lg },
  header:   { alignItems: 'center', marginVertical: SPACING.xl },
  logoBox:  { width: 72, height: 72, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  title:    { fontSize: FONT.xxl, fontWeight: '700', color: COLORS.textPrimary },
  brandBar: { width: 40, height: 4, backgroundColor: COLORS.primary, alignSelf: 'center', marginBottom: SPACING.xl },
  sub:      { fontSize: FONT.md, color: COLORS.textSecondary, marginTop: 4 },
  card:     { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, elevation: 2 },
  cardTitle:{ fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  cardDesc: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 20 },
});
