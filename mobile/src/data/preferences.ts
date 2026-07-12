import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@inventario/preferences';

export interface Preferences {
  notificacoesPush: boolean;
  alertasGarantia: boolean;
  modoCompacto: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  notificacoesPush: true,
  alertasGarantia: true,
  modoCompacto: false,
};

export async function loadPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}
