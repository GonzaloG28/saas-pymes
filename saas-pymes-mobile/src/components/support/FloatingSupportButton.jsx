import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { usePathname } from 'expo-router';
import { supportService } from '../../services/supportService.js';
import { COLORS, SPACING, FONT, RADIUS } from '../../constants/index.js';

const TYPES = [
  { key: 'bug',        label: 'Error',     icon: 'bug-outline' },
  { key: 'suggestion', label: 'Sugerencia', icon: 'bulb-outline' },
  { key: 'other',      label: 'Otro',      icon: 'chatbubble-outline' },
];

export function FloatingSupportButton() {
  const [visible, setVisible]     = useState(false);
  const [type, setType]           = useState('bug');
  const [title, setTitle]         = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving]       = useState(false);
  const pathname = usePathname();

  const reset = () => {
    setType('bug');
    setTitle('');
    setDescription('');
  };

  const close = () => {
    if (saving) return;
    setVisible(false);
    reset();
  };

  const handleSubmit = async () => {
    if (!title.trim())       return Alert.alert('Error', 'Escribe un título');
    if (!description.trim()) return Alert.alert('Error', 'Describe el problema o sugerencia');

    setSaving(true);
    try {
      await supportService.create({
        type,
        title: title.trim(),
        description: description.trim(),
        appVersion: Application.nativeApplicationVersion ?? 'unknown',
        platform: Platform.OS,
        screenContext: pathname,
      });
      Alert.alert('¡Gracias!', 'Tu reporte fue enviado correctamente', [
        { text: 'OK', onPress: close },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'No se pudo enviar el reporte');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <TouchableOpacity style={s.fab} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Ionicons name="chatbox-ellipses-outline" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Modal / canvas encima de toda la pantalla */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={s.overlay}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={close} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.sheetWrap}
          >
            <View style={s.sheet}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Reportar un problema</Text>
                <TouchableOpacity onPress={close}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s.typeRow}>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setType(t.key)}
                    style={[s.typeChip, type === t.key && s.typeChipActive]}
                  >
                    <Ionicons name={t.icon} size={16} color={type === t.key ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[s.typeChipText, type === t.key && s.typeChipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Título</Text>
              <TextInput
                style={s.input}
                placeholder="Ej: No se guarda el stock"
                placeholderTextColor={COLORS.textDisabled}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={s.label}>Descripción</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Cuéntanos qué pasó..."
                placeholderTextColor={COLORS.textDisabled}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[s.submitBtn, saving && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={saving}
              >
                <Text style={s.submitBtnText}>{saving ? 'Enviando...' : 'Enviar reporte'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 90, // sobre la tab bar
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 999,
  },
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sheetTitle:  { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary },
  typeRow:     { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md },
  typeChip:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeChipText: { fontSize: FONT.sm, color: COLORS.textSecondary, fontWeight: '600' },
  typeChipTextActive: { color: COLORS.primary },
  label: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONT.md,
    color: COLORS.textPrimary, backgroundColor: COLORS.white,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center', marginTop: SPACING.lg,
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT.md },
});