import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT, RADIUS } from '../../constants/theme.js';

export function DashboardHeader({ theme, companyName, mode, onToggleTheme, onLogout }) {
  const s = makeStyles(theme);

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.company} numberOfLines={1}>{companyName ?? 'Mi empresa'}</Text>
          <Text style={s.date}>{today}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
          <TouchableOpacity onPress={onToggleTheme} style={s.iconBtn}>
            <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={s.iconBtn}>
            <Ionicons name="log-out-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  wrap:    { marginBottom: SPACING.md },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  company: { fontSize: FONT.xl, fontWeight: '700', color: theme.textPrimary },
  date:    { fontSize: FONT.sm, color: theme.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  iconBtn: { padding: SPACING.sm, backgroundColor: theme.cardBackground, borderRadius: RADIUS.md, borderWidth: 1, borderColor: theme.border },
});
