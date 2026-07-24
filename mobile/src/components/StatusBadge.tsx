import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { statusColor, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius } from '../theme/spacing';
import { StatusEquipamento, statusLabel } from '../types/models';

export function StatusBadge({ status, size = 'md', label }: { status: StatusEquipamento; size?: 'sm' | 'md'; label?: string }) {
  const color = statusColor(status);
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) },
        small && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, small && styles.textSm]}>{label || statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: fonts.monoMedium,
    fontSize: 11.5,
  },
  textSm: {
    fontSize: 10.5,
  },
});
