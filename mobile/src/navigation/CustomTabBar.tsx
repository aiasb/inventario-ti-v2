import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius } from '../theme/spacing';
import { useSheet } from '../context/SheetContext';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';

const TAB_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  Inicio: 'home',
  Itens: 'grid',
  Manutencoes: 'tool',
  Termos: 'file-text',
  Relatorios: 'bar-chart-2',
  Config: 'settings',
  InicioGeo: 'home',
  RadiosTab: 'radio',
  ManutencoesRadiosTab: 'tool',
  ConfigGeo: 'settings',
};

const TAB_LABEL: Record<string, string> = {
  Inicio: 'Início',
  Itens: 'Itens',
  Manutencoes: 'Manutenções',
  Termos: 'Termos',
  Relatorios: 'Relatórios',
  Config: 'Config',
  InicioGeo: 'Início',
  RadiosTab: 'Rádios',
  ManutencoesRadiosTab: 'Manutenções',
  ConfigGeo: 'Config',
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { openNovoEquipamento, openNovoRadio } = useSheet();
  const { podeCriar } = useAuth();
  const { empresaAtual } = useEmpresa();
  const isGeo = empresaAtual === 'geotecnologia';
  const fabModulo = isGeo ? 'radios' : 'inventario';
  const fabAction = isGeo ? openNovoRadio : openNovoEquipamento;

  const half = Math.ceil(state.routes.length / 2);
  const leftRoutes = state.routes.slice(0, half);
  const rightRoutes = state.routes.slice(half);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tabButton}>
        <Feather
          name={TAB_ICON[route.name]}
          size={18}
          color={isFocused ? colors.accent : colors.textMuted}
        />
        <Text
          style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {TAB_LABEL[route.name]}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.row}>
        {leftRoutes.map(renderTab)}
        <View style={styles.fabSpacer} />
        {rightRoutes.map(renderTab)}
      </View>

      {podeCriar(fabModulo) && (
        <Pressable style={styles.fab} onPress={fabAction}>
          <Feather name="plus" size={26} color="#06210b" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceTo,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 44,
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9.5,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.accent,
  },
  fabSpacer: {
    width: 64,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -26,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
    shadowColor: colors.accent,
    shadowOpacity: Platform.OS === 'ios' ? 0.5 : 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});
