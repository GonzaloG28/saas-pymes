// app/index.jsx  ← Punto de entrada: redirige según estado de sesión

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore.js';
import { COLORS } from '../constants/index.js';

export default function Index() {
  const { isLoggedIn, isLoading } = useAuthStore();

  // Mientras verifica el token en SecureStore
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Expo Router redirige sin parpadeo
  return isLoggedIn
    ? <Redirect href="/(app)/dashboard" />
    : <Redirect href="/(auth)/slug" />;
}
