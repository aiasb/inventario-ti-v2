import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { Equipamento } from '../types/models';

interface EquipamentoPickerFieldProps {
  label: string;
  value: Equipamento | null;
  equipamentos: Equipamento[];
  onChange: (equipamento: Equipamento) => void;
  required?: boolean;
}

export function EquipamentoPickerField({ label, value, equipamentos, onChange, required }: EquipamentoPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return equipamentos;
    return equipamentos.filter(
      (e) =>
        e.serial.toLowerCase().includes(q) ||
        e.modelo.toLowerCase().includes(q) ||
        (e.hostname || '').toLowerCase().includes(q)
    );
  }, [equipamentos, query]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable style={styles.field} onPress={() => { setQuery(''); setOpen(true); }}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value ? `${value.modelo} (${value.serial})` : 'Selecionar equipamento'}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionsCard}>
            <Text style={styles.optionsTitle}>{label}</Text>
            <View style={styles.searchBox}>
              <Feather name="search" size={14} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar serial, modelo, hostname…"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionText, item.id === value?.id && { color: colors.accent }]} numberOfLines={1}>
                      {item.modelo}
                    </Text>
                    <Text style={styles.optionSub}>{item.serial}</Text>
                  </View>
                  {item.id === value?.id && <Feather name="check" size={16} color={colors.accent} />}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Nada encontrado.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  field: {
    minHeight: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceFrom,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  value: {
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
    color: colors.text,
  },
  placeholder: {
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 8, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  optionsCard: {
    backgroundColor: colors.surfaceFrom,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionsTitle: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceTo,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 40,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    height: 40,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: spacing.sm,
  },
  optionText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.text,
  },
  optionSub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
