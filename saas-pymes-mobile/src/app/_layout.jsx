// app/_layout.jsx  ← Root layout: corre una vez, envuelve toda la app

import { useEffect } from 'react';
import { Stack }     from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/authStore.js';

export default function RootLayout() {
  const checkSession = useAuthStore((s) => s.checkSession);

  // Verificar sesión guardada al arrancar
  useEffect(() => { checkSession(); }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#F8FAFC" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
