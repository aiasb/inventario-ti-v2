import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { Equipamento, tipoSigla } from '../types/models';
import { StatusBadge } from './StatusBadge';

export function EquipRow({ item, onPress }: { item: Equipamento; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.siglaChip}>
        <Text style={styles.siglaText}>{tipoSigla(item.tipo)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.pat}>{item.serial} <Text style={styles.modelo}>{item.modelo}</Text></Text>
        <Text style={styles.sub} numberOfLines={1}>{item.responsavel?.nome || 'Estoque TI'} · {item.setor?.nome || '—'}</Text>
      </View>
      <StatusBadge status={item.status} size="sm" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  siglaChip: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceFrom,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siglaText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10,
    color: colors.accent,
  },
  info: {
    flex: 1,
  },
  pat: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
  },
  modelo: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  sub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
});
