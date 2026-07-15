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
  return loadJson<TempIdMaps>(TEMP_IDS_KEY, { equipamento: {}, termo: {} });
}

export async function saveTempIdMaps(maps: TempIdMaps): Promise<void> {
  await saveJson(TEMP_IDS_KEY, maps);
}
