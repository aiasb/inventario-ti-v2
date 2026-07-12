import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface BarRowProps {
  label: string;
  count: number;
  max: number;
  color?: string;
  dotColor?: string;
  onPress?: () => void;
}

export function BarRow({ label, count, max, color = colors.accent, dotColor, onPress }: BarRowProps) {
  const percent = max > 0 ? Math.max(4, (count / max) * 100) : 0;
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={styles.row}>
      {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={styles.count}>{count}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    width: 92,
  },
  trackWrap: {
    flex: 1,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  count: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.text,
    width: 22,
    textAlign: 'right',
  },
});
