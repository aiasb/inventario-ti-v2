import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { DetalheScreen } from '../screens/DetalheScreen';
import { BuscaAvancadaScreen } from '../screens/BuscaAvancadaScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { usuario, loading } = useAuth();

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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Group>
        <Stack.Screen name="Tabs" component={TabNavigator} />
      </Stack.Group>
      <Stack.Group screenOptions={{ animation: 'slide_from_right' }}>
        <Stack.Screen name="Detalhe" component={DetalheScreen} />
        <Stack.Screen name="BuscaAvancada" component={BuscaAvancadaScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
