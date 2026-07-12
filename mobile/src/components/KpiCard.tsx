import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';

interface KpiCardProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  value: string | number;
  label: string;
  onPress?: () => void;
}

export function KpiCard({ icon, iconColor, value, label, onPress }: KpiCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <LinearGradient colors={[colors.surfaceFrom, colors.surfaceTo]} style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(iconColor, 0.16) }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    minHeight: 104,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontFamily: fonts.titleBold,
    fontSize: 26,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
