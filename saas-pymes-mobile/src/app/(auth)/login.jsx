// app/(auth)/login.jsx  — Paso 2: email + password

import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore.js';
import { Input }  from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { COLORS, SPACING, FONT, RADIUS } from '../../constants/index.js';

export default function LoginScreen() {
  // Params que vienen de slug.jsx
  const { tenantId, tenantName } = useLocalSearchParams();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors,   setErrors]   = useState({});
  const { login, isLoading }    = useAuthStore();

  const validate = () => {
    const e = {};
    if (!email.trim())    e.email    = 'El email es obligatorio';
    if (!password.trim()) e.password = 'La contraseña es obligatoria';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async () => {
  if (isLoading) return; // bloqueo explícito contra doble tap
  if (!validate()) return;
  try {
    await login(tenantId, email.trim(), password);
    router.replace('/(app)/dashboard');
  } catch (err) {
    setErrors({ password: err.message });
  }
};

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: SPACING.lg }}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>

          {/* Badge con nombre de empresa */}
          <View style={s.badge}>
            <Ionicons name="business-outline" size={16} color={COLORS.primary} />
            <Text style={s.badgeText}>{tenantName ?? 'Tu empresa'}</Text>
          </View>

          <Text style={s.title}>Iniciar sesión</Text>

          <Input label="Email" placeholder="tu@email.com" value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
            error={errors.email} keyboardType="email-address" />

          <View>
            <Input label="Contraseña" placeholder="••••••••" value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
              error={errors.password} secureTextEntry={!showPass}
              returnKeyType="done" onSubmitEditing={handleLogin} />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={s.eye}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Button title="Ingresar" onPress={handleLogin} loading={isLoading} style={{ marginTop: SPACING.sm }} />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.background },
  scroll:    { flexGrow: 1, padding: SPACING.lg },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: SPACING.lg },
  badgeText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.primary },
  title:     { fontSize: FONT.xxl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  eye:       { position: 'absolute', right: SPACING.md, top: 38 },
});
