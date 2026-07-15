import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import { colors } from './src/theme/colors';
import { fontsToLoad } from './src/theme/typography';
import { AuthProvider } from './src/context/AuthContext';
import { AppDataProvider } from './src/context/AppDataContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { ToastProvider } from './src/context/ToastContext';
import { SheetProvider } from './src/context/SheetContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { EquipamentoSheet } from './src/sheets/EquipamentoSheet';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surfaceFrom,
    text: colors.text,
    border: colors.borderSoft,
    primary: colors.accent,
  },
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);
  const ready = fontsLoaded || fontError;

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ToastProvider>
        <AuthProvider>
          <PreferencesProvider>
            <AppDataProvider>
              <SheetProvider>
                <NavigationContainer theme={navigationTheme}>
                  <RootNavigator />
                  <EquipamentoSheet />
                </NavigationContainer>
              </SheetProvider>
            </AppDataProvider>
          </PreferencesProvider>
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
