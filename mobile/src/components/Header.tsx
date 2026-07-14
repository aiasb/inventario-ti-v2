import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';

interface HeaderProps {
  title: string;
  notificationCount?: number;
  onBellPress?: () => void;
}

export function Header({ title, notificationCount = 0, onBellPress }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.left}>
        <Image source={require('../../assets/logo-cacu.png')} style={styles.logoMark} resizeMode="contain" />
        <View>
          <Text style={styles.eyebrow}>USINA CAÇU · INVENTÁRIO TI</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <Pressable style={styles.bellButton} onPress={onBellPress}>
        <Feather name="bell" size={18} color={colors.text} />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.accent,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 20,
    color: colors.text,
  },
  bellButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceFrom,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10,
    color: '#fff',
  },
});
