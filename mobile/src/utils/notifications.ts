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

const OS_RADIOS_SEEN_KEY = '@inventario/osRadiosNotificadas';

async function getSeenOsRadios(): Promise<Set<number> | null> {
  const raw = await AsyncStorage.getItem(OS_RADIOS_SEEN_KEY);
  if (!raw) return null;
  try {
    const ids: number[] = JSON.parse(raw);
    return new Set(ids);
  } catch {
    return null;
  }
}

/**
 * Dispara uma notificação local para novas OS de rádio abertas.
 * Na primeira execução apenas registra as OS já existentes, sem notificar,
 * para não gerar uma enxurrada de notificações com o histórico anterior.
 */
export async function notifyNovasOsRadios(
  itens: { id: number; os: string; referencia: string }[]
): Promise<void> {
  const seen = await getSeenOsRadios();

  if (seen === null) {
    await AsyncStorage.setItem(OS_RADIOS_SEEN_KEY, JSON.stringify(itens.map((i) => i.id)));
    return;
  }

  const novas = itens.filter((i) => !seen.has(i.id));
  if (novas.length > 0) {
    const granted = await requestNotificationPermission();
    if (granted) {
      const titulo = novas.length === 1 ? 'Nova OS de rádio aberta' : `${novas.length} novas OS de rádio abertas`;
      const corpo =
        novas.length === 1
          ? `${novas[0].os} — ${novas[0].referencia}`
          : novas
              .slice(0, 3)
              .map((i) => i.os)
              .join(', ') + (novas.length > 3 ? '…' : '');

      await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: corpo },
        trigger: null,
      });
    }
  }

  const todosIds = new Set([...seen, ...itens.map((i) => i.id)]);
  await AsyncStorage.setItem(OS_RADIOS_SEEN_KEY, JSON.stringify([...todosIds]));
}
