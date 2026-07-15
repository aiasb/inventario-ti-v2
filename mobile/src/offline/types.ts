import { EditarEquipamentoInput, NovaManutencaoInput, NovoEquipamentoInput, NovoTermoInput } from '../data/repository';

/**
 * Uma operação de mutação enfileirada para rodar quando a rede voltar.
 * `tempId` é o id local (negativo) atribuído otimisticamente ao registro
 * criado offline — some do estado assim que o servidor confirma o real.
 * Ids referenciados por operações dependentes (ex.: abrir OS de um
 * equipamento criado offline) também podem ser temporários; são resolvidos
 * para o id real no momento do envio, via `resolveTempId`.
 */
export type QueuedOperation =
  | { kind: 'criarEquipamento'; tempId: number; input: NovoEquipamentoInput }
  | { kind: 'editarEquipamento'; equipamentoId: number; input: EditarEquipamentoInput }
  | { kind: 'abrirOs'; tempId: number; input: NovaManutencaoInput }
  | { kind: 'criarTermo'; tempId: number; input: NovoTermoInput }
  | { kind: 'alternarAssinaturaTermo'; termoId: number; assinado: boolean }
  | { kind: 'alternarDevolucaoTermo'; termoId: number; devolvido: boolean }
  | { kind: 'excluirTermo'; termoId: number };

export type QueuedOperationKind = QueuedOperation['kind'];

export interface StoredQueueItem {
  id: string; // UUID — também usado como Idempotency-Key na requisição
  createdAt: string;
  attempts: number;
  lastError?: string;
  /** true quando o servidor rejeitou definitivamente (não é erro de rede) — precisa de ação do usuário. */
  blocked?: boolean;
  op: QueuedOperation;
}

export interface TempIdMaps {
  equipamento: Record<number, number>;
  termo: Record<number, number>;
}

export interface SyncState {
  syncing: boolean;
  pendingCount: number;
  items: StoredQueueItem[];
  blockedItems: StoredQueueItem[];
}
