import { loadJson, saveJson } from './storage';
import { Equipamento, Manutencao, Responsavel, Setor, Termo, TermoModelo, TipoEquipamento } from '../types/models';

export interface AppDataSnapshot {
  equipamentos: Equipamento[];
  manutencoes: Manutencao[];
  responsaveis: Responsavel[];
  setores: Setor[];
  tiposEquipamento: TipoEquipamento[];
  termos: Termo[];
  termoModelos: TermoModelo[];
  savedAt: string;
}

const KEY = 'snapshot';

/** Último conjunto de dados obtido com sucesso do servidor — usado para
 * abrir o app já com conteúdo quando não há rede disponível. */
export async function loadSnapshot(): Promise<AppDataSnapshot | null> {
  return loadJson<AppDataSnapshot | null>(KEY, null);
}

export async function saveSnapshot(snapshot: Omit<AppDataSnapshot, 'savedAt'>): Promise<void> {
  await saveJson(KEY, { ...snapshot, savedAt: new Date().toISOString() });
}
