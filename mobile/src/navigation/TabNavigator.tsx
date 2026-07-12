import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import { CustomTabBar } from './CustomTabBar';
import { InicioScreen } from '../screens/InicioScreen';
import { ItensScreen } from '../screens/ItensScreen';
import { RelatoriosScreen } from '../screens/RelatoriosScreen';
import { ConfiguracoesScreen } from '../screens/ConfiguracoesScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Inicio" component={InicioScreen} />
      <Tab.Screen name="Itens" component={ItensScreen} />
      <Tab.Screen name="Relatorios" component={RelatoriosScreen} />
      <Tab.Screen name="Config" component={ConfiguracoesScreen} />
    </Tab.Navigator>
  );
}
