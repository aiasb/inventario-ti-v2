import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius } from '../theme/spacing';

interface ChipProps {
  label: string;
  count?: number;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ label, count, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: withAlpha(colors.accent, 0.16), borderColor: withAlpha(colors.accent, 0.5) }
          : { backgroundColor: colors.surfaceFrom, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: active ? colors.accent : colors.textSecondary }]}>
        {label}
        {count !== undefined ? ` ${count}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
