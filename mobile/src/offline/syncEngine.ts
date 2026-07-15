import { AppState } from 'react-native';
import { useSyncExternalStore } from 'react';
import { ApiClientError } from '../api/client';
import { repository } from '../data/repository';
import { generateUuid } from './uuid';
import { loadQueue, saveQueue, loadTempIdMaps, saveTempIdMaps } from './queue';
import { QueuedOperation, StoredQueueItem, SyncState, TempIdMaps } from './types';

let queue: StoredQueueItem[] = [];
let tempIds: TempIdMaps = { equipamento: {}, termo: {} };
let initialized = false;
let flushing = false;
let timer: ReturnType<typeof setInterval> | null = null;

type Listener = (state: SyncState) => void;
type ProgressListener = () => void;

const listeners = new Set<Listener>();
const progressListeners = new Set<ProgressListener>();

// useSyncExternalStore exige que getSnapshot devolva a MESMA referência
// enquanto nada mudou (senão o React entende que a store muda a cada
// chamada e entra num loop de re-render — foi exatamente esse o bug: cada
// render recalculava um objeto/array novos, travando qualquer tela que usa
// useSyncState logo após o login, quando o Header passou a montar o
// SyncBanner). O snapshot só é recalculado dentro de notify().
let cachedState: SyncState = { syncing: false, pendingCount: 0, items: [], blockedItems: [] };

function computeState(): SyncState {
  return {
    syncing: flushing,
    pendingCount: queue.length,
    items: [...queue],
    blockedItems: queue.filter((i) => i.blocked),
  };
}

function getState(): SyncState {
  return cachedState;
}

function notify() {
  cachedState = computeState();
  listeners.forEach((fn) => fn(cachedState));
}

function notifyProgress() {
  progressListeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Chamado sempre que ao menos uma operação da fila sincroniza com sucesso —
 * o assinante (AppDataContext) deve buscar os dados atualizados do servidor. */
export function onProgress(fn: ProgressListener): () => void {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

function ensureTimer() {
  if (timer || queue.length === 0) return;
  timer = setInterval(() => void flush(), 20000);
}

function clearTimerIfIdle() {
  if (timer && queue.every((i) => i.blocked)) {
    clearInterval(timer);
    timer = null;
  }
}

/** Carrega o estado persistido e liga os gatilhos automáticos de sincronização.
 * Chamar uma vez no boot do app (idempotente — chamadas seguintes são no-op). */
export async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;
  queue = await loadQueue();
  tempIds = await loadTempIdMaps();
  ensureTimer();

  AppState.addEventListener('change', (next) => {
    if (next === 'active') void flush();
  });

  void flush();
}

function resolveId(kind: 'equipamento' | 'termo', id: number): number {
  if (id >= 0) return id;
  return tempIds[kind][id] ?? id;
}

interface DispatchOk {
  ok: true;
  tempId?: number;
  realId?: number;
}
interface DispatchNetworkError {
  ok: false;
  network: true;
}
interface DispatchBlocked {
  ok: false;
  network: false;
  message: string;
}

async function dispatchOnce(item: StoredQueueItem): Promise<DispatchOk | DispatchNetworkError | DispatchBlocked> {
  const idem = item.id;
  try {
    switch (item.op.kind) {
      case 'criarEquipamento': {
        const created = await repository.createEquipamento(item.op.input, idem);
        tempIds.equipamento[item.op.tempId] = created.id;
        await saveTempIdMaps(tempIds);
        return { ok: true, tempId: item.op.tempId, realId: created.id };
      }
      case 'editarEquipamento': {
        const id = resolveId('equipamento', item.op.equipamentoId);
        await repository.updateEquipamento(id, item.op.input, idem);
        return { ok: true };
      }
      case 'abrirOs': {
        const equipamentoId = resolveId('equipamento', item.op.input.equipamentoId);
        await repository.createManutencao({ ...item.op.input, equipamentoId }, idem);
        return { ok: true };
      }
      case 'criarTermo': {
        const equipamentoId = resolveId('equipamento', item.op.input.equipamentoId);
        const created = await repository.createTermo({ ...item.op.input, equipamentoId }, idem);
        tempIds.termo[item.op.tempId] = created.id;
        await saveTempIdMaps(tempIds);
        return { ok: true, tempId: item.op.tempId, realId: created.id };
      }
      case 'alternarAssinaturaTermo': {
        const id = resolveId('termo', item.op.termoId);
        await repository.setTermoAssinatura(id, item.op.assinado, idem);
        return { ok: true };
      }
      case 'alternarDevolucaoTermo': {
        const id = resolveId('termo', item.op.termoId);
        await repository.setTermoDevolucao(id, item.op.devolvido, idem);
        return { ok: true };
      }
      case 'excluirTermo': {
        const id = resolveId('termo', item.op.termoId);
        await repository.deleteTermo(id, idem);
        return { ok: true };
      }
    }
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 0) {
      return { ok: false, network: true };
    }
    const message = err instanceof ApiClientError ? err.message : 'Erro inesperado ao sincronizar.';
    return { ok: false, network: false, message };
  }
}

/** Processa a fila em ordem (FIFO) até esvaziar, travar num item bloqueado
 * (erro definitivo do servidor) ou perder a rede de novo. Operações
 * dependentes de um id temporário (ex.: abrir OS de um equipamento criado
 * offline) resolvem naturalmente porque a criação sempre é enfileirada
 * antes — processar estritamente em ordem garante que o mapeamento já
 * exista quando chegar a vez do item dependente. */
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  notify();
  let syncedCount = 0;

  try {
    while (queue.length > 0) {
      const item = queue[0];
      if (item.blocked) break;

      const result = await dispatchOnce(item);
      if (result.ok) {
        queue.shift();
        syncedCount += 1;
        await saveQueue(queue);
      } else if (result.network) {
        item.attempts += 1;
        item.lastError = 'Sem conexão com o servidor.';
        await saveQueue(queue);
        break;
      } else {
        item.blocked = true;
        item.lastError = result.message;
        await saveQueue(queue);
        break;
      }
    }
  } finally {
    flushing = false;
    clearTimerIfIdle();
    notify();
    if (syncedCount > 0) notifyProgress();
  }
}

export const retryNow = flush;

/** Enfileira uma operação e devolve o item imediatamente (o chamador usa
 * `tempId`, quando presente, para montar o objeto otimista exibido na UI
 * antes da sincronização real acontecer). */
export function enqueue(op: QueuedOperation): StoredQueueItem {
  const item: StoredQueueItem = { id: generateUuid(), createdAt: new Date().toISOString(), attempts: 0, op };
  queue.push(item);
  ensureTimer();
  notify();
  void saveQueue(queue).then(() => flush());
  return item;
}

/** Remove um item travado (erro definitivo) da fila a pedido do usuário.
 * Operações ainda na fila que dependessem do id temporário desse item
 * (uma criação) são removidas em cascata, já que essa dependência nunca vai
 * existir no servidor. Depois de descartar, o chamador deve rodar
 * `refresh()` do AppDataContext para realinhar o estado local com o
 * servidor (o objeto otimista correspondente não veio de lá, então some
 * sozinho da lista atualizada). */
export async function discardItem(id: string): Promise<void> {
  const idx = queue.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const [removed] = queue.splice(idx, 1);

  const tempId = 'tempId' in removed.op ? removed.op.tempId : undefined;
  if (tempId !== undefined) {
    queue = queue.filter((i) => !dependsOnTempId(i.op, tempId));
  }

  await saveQueue(queue);
  clearTimerIfIdle();
  notify();
}

/** Cancela uma criação ainda não sincronizada (usado quando o usuário exclui,
 * antes de a rede voltar, algo que ele mesmo criou offline) — como nada foi
 * enviado ao servidor ainda, não há nada para desfazer lá, só remover da fila. */
export async function cancelPendingCreate(kind: 'equipamento' | 'termo', tempId: number): Promise<void> {
  const opKind = kind === 'equipamento' ? 'criarEquipamento' : 'criarTermo';
  const item = queue.find((i) => i.op.kind === opKind && 'tempId' in i.op && i.op.tempId === tempId);
  if (item) await discardItem(item.id);
}

function dependsOnTempId(op: QueuedOperation, tempId: number): boolean {
  switch (op.kind) {
    case 'editarEquipamento':
      return op.equipamentoId === tempId;
    case 'abrirOs':
    case 'criarTermo':
      return op.input.equipamentoId === tempId;
    case 'alternarAssinaturaTermo':
    case 'alternarDevolucaoTermo':
    case 'excluirTermo':
      return op.termoId === tempId;
    default:
      return false;
  }
}

function subscribeForHook(onStoreChange: () => void): () => void {
  return subscribe(onStoreChange);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeForHook, getState, getState);
}
