import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface ToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}

export function ToggleRow({ title, subtitle, value, onValueChange, isLast }: ToggleRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accentGradientFrom }}
        thumbColor="#fff"
      />
    </View>
  );
}

interface LinkRowProps {
  title: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
}

export function LinkRow({ title, value, onPress, isLast }: LinkRowProps) {
  return (
    <Pressable style={[styles.row, !isLast && styles.divider]} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightWrap}>
        {value && <Text style={styles.value}>{value}</Text>}
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 44,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  textWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
