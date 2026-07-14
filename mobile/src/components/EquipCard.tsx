import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { Equipamento, tipoSigla } from '../types/models';
import { warrantyInfo } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import { WarrantyBar } from './WarrantyBar';

export function EquipCard({ item, onPress }: { item: Equipamento; onPress: () => void }) {
  const warranty = warrantyInfo(item.dataAquisicao, item.dataGarantia);

  return (
    <Pressable onPress={onPress}>
      <LinearGradient colors={[colors.surfaceFrom, colors.surfaceTo]} style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.siglaChip}>
            <Text style={styles.siglaText}>{tipoSigla(item.tipo)}</Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        <Text style={styles.pat}>{item.serial}</Text>
        <Text style={styles.modelo} numberOfLines={1}>{item.modelo}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLeft} numberOfLines={1}>{item.responsavel?.nome || 'Estoque TI'}</Text>
          <Text style={styles.metaRight} numberOfLines={1}>{item.setor?.nome || '—'}</Text>
        </View>

        <View style={styles.warrantyWrap}>
          <WarrantyBar info={warranty} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  siglaChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTo,
    borderWidth: 1,
    borderColor: colors.border,
  },
  siglaText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: colors.accent,
  },
  pat: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    color: colors.accent,
    marginBottom: 2,
  },
  modelo: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.text,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: spacing.sm,
  },
  metaLeft: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  metaRight: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  warrantyWrap: {
    marginTop: 2,
  },
});
