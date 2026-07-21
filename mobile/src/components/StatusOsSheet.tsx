import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { Insumo, STATUS_MANUTENCAO, StatusManutencao, statusManutencaoLabel } from '../types/models';

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
  onConfirm: (status: StatusManutencao, insumoIds?: number[]) => void;
  /** Status para os quais é obrigatório informar ao menos um insumo utilizado antes de confirmar. */
  insumoRequiredFor?: StatusManutencao[];
  insumos?: Insumo[];
}

/** Bottom sheet customizado para mover uma OS de status — substitui os
 * Alert.alert nativos por um fluxo em duas etapas (escolher → confirmar)
 * dentro do próprio visual do app. */
export function StatusOsSheet({ visible, onClose, os, currentStatus, onConfirm, insumoRequiredFor, insumos }: StatusOsSheetProps) {
  const [selected, setSelected] = useState<StatusManutencao | null>(null);
  const [insumoIds, setInsumoIds] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setInsumoIds([]);
    }
  }, [visible]);

  const opcoes = STATUS_MANUTENCAO.filter((s) => s !== currentStatus);
  const precisaInsumo = !!selected && !!insumoRequiredFor?.includes(selected);
  const insumoOptions = (insumos || []).filter((i) => i.ativo);

  function toggleInsumo(id: number) {
    setInsumoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleConfirm() {
    if (!selected) return;
    if (precisaInsumo && insumoIds.length === 0) return;
    onConfirm(selected, insumoIds.length ? insumoIds : undefined);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={selected ? (precisaInsumo ? 0.62 : 0.32) : 0.42}>
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
          {precisaInsumo && (
            <View style={styles.insumoWrap}>
              <Text style={styles.insumoLabel}>Insumos utilizados * (selecione um ou mais)</Text>
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                {insumoOptions.map((i) => {
                  const checked = insumoIds.includes(i.id);
                  return (
                    <Pressable key={i.id} style={styles.insumoRow} onPress={() => toggleInsumo(i.id)}>
                      <Feather name={checked ? 'check-square' : 'square'} size={18} color={checked ? colors.accent : colors.textMuted} />
                      <Text style={styles.insumoText}>{i.nome}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
          <View style={styles.actions}>
            <Pressable style={styles.backBtn} onPress={() => setSelected(null)}>
              <Text style={styles.cancelText}>Voltar</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, precisaInsumo && insumoIds.length === 0 && { opacity: 0.5 }]}
              disabled={precisaInsumo && insumoIds.length === 0}
              onPress={handleConfirm}
            >
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
  insumoWrap: {
    marginBottom: spacing.md,
  },
  insumoLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  insumoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  insumoText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.text,
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
