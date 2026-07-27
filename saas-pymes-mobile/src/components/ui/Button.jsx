import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, RADIUS, FONT } from '../../constants/index.js';

export function Button({ title, onPress, loading, disabled, variant = 'primary', style }) {
  const off = disabled || loading;
  return (
    <TouchableOpacity onPress={onPress} disabled={off} activeOpacity={0.8}
      style={[styles.base, styles[variant], off && styles.disabled, style]}>
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.white} size="small" />
        : <Text style={[styles.text, variant === 'outline' && styles.textOutline]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:        { borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primary:     { backgroundColor: COLORS.primary },
  outline:     { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.primary },
  danger:      { backgroundColor: COLORS.danger },
  disabled:    { opacity: 0.5 },
  text:        { fontSize: FONT.md, fontWeight: '600', color: COLORS.white },
  textOutline: { color: COLORS.primary },
});
