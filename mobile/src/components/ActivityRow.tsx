import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { Atividade } from '../types/models';
import { relativeTime } from '../utils/format';

const DOT_COLOR: Record<Atividade['cor'], string> = {
  accent: colors.accent,
  warning: colors.statusManutencao,
  muted: colors.textMuted,
};

export function ActivityRow({ item, isLast }: { item: Atividade; isLast?: boolean }) {
  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      <View style={[styles.dot, { backgroundColor: DOT_COLOR[item.cor] }]} />
      <View style={styles.content}>
        <Text style={styles.text}>{item.texto}</Text>
        <Text style={styles.meta}>{relativeTime(item.data)} · {item.autor}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: spacing.sm,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
  },
  content: {
    flex: 1,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  meta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 3,
  },
});
