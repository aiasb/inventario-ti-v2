import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { STATUS_MANUTENCAO, StatusManutencao, statusManutencaoLabel } from '../types/models';

function statusColor(status: StatusManutencao): string {
  if (status === 'Concluida') return colors.accent;
  if (status === 'Em andamento') return colors.statusEstoque;
  return colors.statusManutencao;
}

interface StatusOsSheetProps {
  visible: boolean;
  onClose: () => void;
  os: string;
  currentStatus: StatusManutencao;
  onConfirm: (status: StatusManutencao) => void;
}

/** Bottom sheet customizado para mover uma OS de status — substitui os
 * Alert.alert nativos por um fluxo em duas etapas (escolher → confirmar)
 * dentro do próprio visual do app. */
export function StatusOsSheet({ visible, onClose, os, currentStatus, onConfirm }: StatusOsSheetProps) {
  const [selected, setSelected] = useState<StatusManutencao | null>(null);

  useEffect(() => {
    if (visible) setSelected(null);
  }, [visible]);

  const opcoes = STATUS_MANUTENCAO.filter((s) => s !== currentStatus);

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={selected ? 0.32 : 0.42}>
      <Text style={styles.os}>{os}</Text>

      {!selected && (
        <>
          <Text style={styles.subtitle}>Mover para qual status?</Text>
          {opcoes.map((s) => {
            const color = statusColor(s);
            return (
              <Pressable key={s} style={styles.option} onPress={() => setSelected(s)}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.optionText}>{statusManutencaoLabel(s)}</Text>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </>
      )}

      {selected && (
        <>
          <View style={[styles.confirmBadge, { backgroundColor: withAlpha(statusColor(selected), 0.14), borderColor: withAlpha(statusColor(selected), 0.32) }]}>
            <View style={[styles.dot, { backgroundColor: statusColor(selected) }]} />
            <Text style={[styles.confirmBadgeText, { color: statusColor(selected) }]}>{statusManutencaoLabel(selected)}</Text>
          </View>
          <Text style={styles.confirmText}>Confirma mover esta OS para o status acima?</Text>
          <View style={styles.actions}>
            <Pressable style={styles.backBtn} onPress={() => setSelected(null)}>
              <Text style={styles.cancelText}>Voltar</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirmar</Text>
            </Pressable>
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  os: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.accent,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  cancelBtn: {
    height: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  confirmBadgeText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12.5,
  },
  confirmText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  backBtn: {
    flex: 1,
    height: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 2,
    height: touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#06210b',
  },
});
