import { loadJson, saveJson } from './storage';
import { StoredQueueItem, TempIdMaps } from './types';

const QUEUE_KEY = 'queue';
const TEMP_IDS_KEY = 'tempIds';

export async function loadQueue(): Promise<StoredQueueItem[]> {
  return loadJson<StoredQueueItem[]>(QUEUE_KEY, []);
}

export async function saveQueue(items: StoredQueueItem[]): Promise<void> {
  await saveJson(QUEUE_KEY, items);
}

export async function loadTempIdMaps(): Promise<TempIdMaps> {
  // Mescla com o default: um app já instalado pode ter persistido o mapa
  // antes da chave "radio" existir, e faltar a chave quebraria o acesso
  // `tempIds.radio[...]` em runtime.
  const loaded = await loadJson<Partial<TempIdMaps>>(TEMP_IDS_KEY, {});
  return { equipamento: {}, termo: {}, radio: {}, ...loaded };
}

export async function saveTempIdMaps(maps: TempIdMaps): Promise<void> {
  await saveJson(TEMP_IDS_KEY, maps);
}
