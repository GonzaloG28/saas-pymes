// app/(auth)/_layout.jsx
// Stack sin header para las pantallas de autenticación.
// El grupo (auth) no aparece en la URL — solo es un agrupador.

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
