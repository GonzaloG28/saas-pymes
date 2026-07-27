// src/app/(app)/_layout.jsx

import { useEffect } from 'react';
import { Tabs }     from 'expo-router';
import { router }   from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore.js';
import { FloatingSupportButton } from '../../components/support/FloatingSupportButton.jsx';
import { FloatingPaymentButton } from '../../components/payments/FloatingPaymentButton.jsx';
import { COLORS, FONT } from '../../constants/index.js';

export default function AppLayout() {
  const { isLoggedIn, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/(auth)/slug');
    }
  }, [isLoggedIn, isLoading]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown:          false,
          tabBarActiveTintColor:   COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor:  COLORS.border,
            paddingBottom:   4,
            height:          58,
          },
          tabBarLabelStyle: { fontSize: FONT.sm, fontWeight: '600', marginBottom: 4 },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) =>
              <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="products/index"
          options={{
            title: 'Productos',
            tabBarIcon: ({ color, size }) =>
              <Ionicons name="cube-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sales/create"
          options={{
            title: 'Venta',
            tabBarIcon: ({ color, size }) =>
              <Ionicons name="cash-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="products/create"
          options={{
            title: 'Agregar',
            tabBarIcon: ({ color, size }) =>
              <Ionicons name="add-circle-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="movements/index"
          options={{
            title: 'Historial',
            tabBarIcon: ({ color, size }) =>
              <Ionicons name="time-outline" size={size} color={color} />,
          }}
        />

        {/* Ocultar estas rutas de los tabs — son pantallas normales sin tab */}
        <Tabs.Screen
          name="products/[id]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="payments/point"
          options={{ href: null }}
        />
      </Tabs>
      <FloatingPaymentButton />
      <FloatingSupportButton />
    </>
  );
}