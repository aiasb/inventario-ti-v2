import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { usePreferences } from '../context/PreferencesContext';
import { RootStackParamList } from '../navigation/types';
import { NotificacoesPanel } from './NotificacoesPanel';
import { SyncBanner } from './SyncBanner';

interface HeaderProps {
  title: string;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function Header({ title }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { garantiasVencendo } = useAppData();
  const { preferences } = usePreferences();
  const [panelVisible, setPanelVisible] = useState(false);

  const notificationCount = preferences.alertasGarantia ? garantiasVencendo.length : 0;

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.left}>
          <Image source={require('../../assets/logo-cacu.png')} style={styles.logoMark} resizeMode="contain" />
          <View>
            <Text style={styles.eyebrow}>USINA CAÇU · INVENTÁRIO TI</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        <Pressable style={styles.bellButton} onPress={() => setPanelVisible(true)}>
          <Feather name="bell" size={18} color={colors.text} />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <SyncBanner onPress={() => navigation.navigate('Sincronizacao')} />

      <NotificacoesPanel
        visible={panelVisible}
        onClose={() => setPanelVisible(false)}
        alertasAtivos={preferences.alertasGarantia}
        itens={garantiasVencendo.map(({ equipamento, warranty }) => ({
          id: equipamento.id,
          serial: equipamento.serial,
          modelo: equipamento.modelo,
          dias: warranty.days ?? 0,
        }))}
        onItemPress={(id) => navigation.navigate('Detalhe', { id })}
      />
    </>
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
