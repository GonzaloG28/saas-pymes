// app/(auth)/onboarding.jsx — reemplaza el flujo de "primera vez"

import { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { authService } from '../../services/authService.js';
import { useAuthStore } from '../../store/authStore.js';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

export default function OnboardingScreen() {
  const { token } = useLocalSearchParams();
  const [tenantName, setTenantName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setSession = useAuthStore((s) => s.setSession); // nuevo action a agregar al store

  useEffect(() => {
    authService.verifyOnboardingToken(token)
      .then((data) => setTenantName(data.tenant.name))
      .catch(() => Alert.alert('Enlace inválido', 'Este enlace expiró o ya fue usado', [{ text: 'OK', onPress: () => router.replace('/(auth)/slug') }]))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (password !== confirm) return Alert.alert('Error', 'Las contraseñas no coinciden');
    setSaving(true);
    try {
      const { user, accessToken } = await authService.completeOnboarding(token, password);
      setSession({ user, accessToken });
      router.replace('/(app)/terms-acceptance'); // siguiente paso obligatorio: aceptar términos
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><Text>Cargando...</Text></View>;

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Bienvenido a {tenantName}</Text>
      <Text style={{ marginBottom: 24, color: '#666' }}>Crea tu contraseña definitiva para continuar</Text>
      <Input label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      <Input label="Confirmar contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry />
      <Button title="Confirmar y entrar" onPress={handleSubmit} loading={saving} />
    </View>
  );
}