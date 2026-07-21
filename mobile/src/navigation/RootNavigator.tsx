import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { DetalheScreen } from '../screens/DetalheScreen';
import { BuscaAvancadaScreen } from '../screens/BuscaAvancadaScreen';
import { CadastrosScreen } from '../screens/CadastrosScreen';
import { ResponsaveisScreen } from '../screens/ResponsaveisScreen';
import { AcessosScreen } from '../screens/AcessosScreen';
import { SincronizacaoScreen } from '../screens/SincronizacaoScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SelecionarEmpresaScreen } from '../screens/SelecionarEmpresaScreen';
import { RadiosScreen } from '../screens/RadiosScreen';
import { DetalheRadioScreen } from '../screens/DetalheRadioScreen';
import { ManutencoesRadiosScreen } from '../screens/ManutencoesRadiosScreen';
import { ResponsaveisGeoScreen } from '../screens/ResponsaveisGeoScreen';
import { CadastrosGeoScreen } from '../screens/CadastrosGeoScreen';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { usuario, loading } = useAuth();
  const { precisaEscolher } = useEmpresa();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!usuario) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  if (precisaEscolher) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SelecionarEmpresa" component={SelecionarEmpresaScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Group>
        <Stack.Screen name="Tabs" component={TabNavigator} />
      </Stack.Group>
      <Stack.Group screenOptions={{ animation: 'slide_from_right' }}>
        <Stack.Screen name="Detalhe" component={DetalheScreen} />
        <Stack.Screen name="BuscaAvancada" component={BuscaAvancadaScreen} />
        <Stack.Screen name="Cadastros" component={CadastrosScreen} />
        <Stack.Screen name="Responsaveis" component={ResponsaveisScreen} />
        <Stack.Screen name="Acessos" component={AcessosScreen} />
        <Stack.Screen name="Sincronizacao" component={SincronizacaoScreen} />
        <Stack.Screen name="Radios" component={RadiosScreen} />
        <Stack.Screen name="DetalheRadio" component={DetalheRadioScreen} />
        <Stack.Screen name="ManutencoesRadios" component={ManutencoesRadiosScreen} />
        <Stack.Screen name="ResponsaveisGeo" component={ResponsaveisGeoScreen} />
        <Stack.Screen name="CadastrosGeo" component={CadastrosGeoScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
