import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS, RADIUS, FONT, SPACING } from '../../constants/index.js';

export function Input({ label, error, style, ...props }) {
  return (
    <View style={[styles.wrap, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput style={[styles.input, error && styles.inputErr]}
        placeholderTextColor={COLORS.textDisabled} autoCapitalize="none" {...props} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { marginBottom: SPACING.md },
  label:    { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  input:    { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONT.md, color: COLORS.textPrimary, backgroundColor: COLORS.white },
  inputErr: { borderColor: COLORS.danger },
  error:    { fontSize: FONT.sm, color: COLORS.danger, marginTop: SPACING.xs },
});
