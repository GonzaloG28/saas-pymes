import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, SPACING } from '../../constants/index.js';

export function FloatingPaymentButton() {
  return (
    <TouchableOpacity
      style={s.fab}
      onPress={() => router.push('/(app)/payments/point')}
      activeOpacity={0.8}
    >
      <Ionicons name="card-outline" size={24} color={COLORS.white} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: SPACING.lg,
    bottom: 90,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 999,
  },
});