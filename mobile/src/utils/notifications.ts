import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const NOTIFIED_KEY = '@inventario/garantiasNotificadas';

interface NotifiedState {
  date: string;
  ids: number[];
}

async function getNotifiedHoje(): Promise<Set<number>> {
  const raw = await AsyncStorage.getItem(NOTIFIED_KEY);
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!raw) return new Set();
  try {
    const state: NotifiedState = JSON.parse(raw);
    return state.date === todayKey ? new Set(state.ids) : new Set();
  } catch {
    return new Set();
  }
}

/** Dispara uma notificação local (sem servidor push) para garantias ainda não avisadas hoje. */
export async function notifyGarantiasVencendo(
  itens: { id: number; serial: string; modelo: string; dias: number }[]
): Promise<void> {
  if (itens.length === 0) return;

  const jaNotificados = await getNotifiedHoje();
  const novos = itens.filter((i) => !jaNotificados.has(i.id));
  if (novos.length === 0) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const titulo = novos.length === 1 ? 'Garantia vencendo' : `${novos.length} garantias vencendo`;
  const corpo =
    novos.length === 1
      ? `${novos[0].modelo} (${novos[0].serial}) — ${novos[0].dias} dias restantes`
      : novos
          .slice(0, 3)
          .map((i) => i.serial)
          .join(', ') + (novos.length > 3 ? '…' : '');

  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: corpo },
    trigger: null,
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const todosIds = [...jaNotificados, ...novos.map((i) => i.id)];
  await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify({ date: todayKey, ids: todosIds }));
}
