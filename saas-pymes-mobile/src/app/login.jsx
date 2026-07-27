import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore.js';
import { useThemeStore } from '../store/themeStore.js';
import { Input } from '../components/ui/Input.jsx';
import { getTheme } from '../constants/theme.js';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, isLoading } = useAuthStore();
  const { mode } = useThemeStore();
  const theme = getTheme(mode);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'El correo es obligatorio';
    if (!password.trim()) e.password = 'La contraseña es obligatoria';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async () => {
    if (!validate() || isLoading) return;
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      setErrors({ password: err.message ?? 'Credenciales inválidas' });
    }
  };

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.content}>
          <View style={s.logoBox}>
            <Text style={{ fontSize: 40 }}>📦</Text>
          </View>
          <Text style={s.title}>Bienvenido</Text>
          <Text style={s.subtitle}>Ingresa a tu cuenta para continuar</Text>

          <View style={s.form}>
            <Input
              label="Correo electrónico"
              placeholder="tu@empresa.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View>
              <Input
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
                error={errors.password}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{showPass ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.button, isLoading && s.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Ingresar</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Overlay de carga bloqueante, adicional al spinner del botón */}
        {isLoading && (
          <View style={s.overlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: theme.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 32 },
  form: { gap: 4 },
  eyeBtn: { position: 'absolute', right: 4, top: 10 },
  button: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
});