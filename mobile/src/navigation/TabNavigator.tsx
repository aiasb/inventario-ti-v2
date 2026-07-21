import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamListGeo, TabParamListTI } from './types';
import { CustomTabBar } from './CustomTabBar';
import { useEmpresa } from '../context/EmpresaContext';
import { InicioScreen } from '../screens/InicioScreen';
import { ItensScreen } from '../screens/ItensScreen';
import { ManutencoesScreen } from '../screens/ManutencoesScreen';
import { TermosScreen } from '../screens/TermosScreen';
import { RelatoriosScreen } from '../screens/RelatoriosScreen';
import { ConfiguracoesScreen } from '../screens/ConfiguracoesScreen';
import { InicioGeoScreen } from '../screens/InicioGeoScreen';
import { RadiosScreen } from '../screens/RadiosScreen';
import { ManutencoesRadiosScreen } from '../screens/ManutencoesRadiosScreen';
import { RelatoriosGeoScreen } from '../screens/RelatoriosGeoScreen';
import { OcorrenciasScreen } from '../screens/OcorrenciasScreen';

const TabTI = createBottomTabNavigator<TabParamListTI>();
const TabGeo = createBottomTabNavigator<TabParamListGeo>();

function TabNavigatorTI() {
  return (
    <TabTI.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <TabTI.Screen name="Inicio" component={InicioScreen} />
      <TabTI.Screen name="Itens" component={ItensScreen} />
      <TabTI.Screen name="Manutencoes" component={ManutencoesScreen} />
      <TabTI.Screen name="Termos" component={TermosScreen} />
      <TabTI.Screen name="Relatorios" component={RelatoriosScreen} />
      <TabTI.Screen name="Config" component={ConfiguracoesScreen} />
    </TabTI.Navigator>
  );
}

function TabNavigatorGeo() {
  return (
    <TabGeo.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <TabGeo.Screen name="InicioGeo" component={InicioGeoScreen} />
      <TabGeo.Screen name="RadiosTab" component={RadiosScreen} />
      <TabGeo.Screen name="ManutencoesRadiosTab" component={ManutencoesRadiosScreen} />
      <TabGeo.Screen name="RelatoriosGeoTab" component={RelatoriosGeoScreen} />
      <TabGeo.Screen name="OcorrenciasTab" component={OcorrenciasScreen} />
      <TabGeo.Screen name="ConfigGeo" component={ConfiguracoesScreen} />
    </TabGeo.Navigator>
  );
}

/** Alterna o conjunto de abas conforme a empresa selecionada (ver
 * EmpresaContext) — TI e Geotecnologia têm módulos completamente
 * diferentes, então os menus/dashboard precisam corresponder. */
export function TabNavigator() {
  const { empresaAtual } = useEmpresa();
  return empresaAtual === 'geotecnologia' ? <TabNavigatorGeo /> : <TabNavigatorTI />;
}
