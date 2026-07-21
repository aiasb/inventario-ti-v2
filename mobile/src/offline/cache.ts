import { loadJson, saveJson } from './storage';
import {
  AreaGeo,
  Equipamento,
  Frota,
  Insumo,
  ManutencaoRadio,
  Manutencao,
  Radio,
  Responsavel,
  ResponsavelGeo,
  Setor,
  Termo,
  TermoModelo,
  TipoEquipamento,
} from '../types/models';

export interface AppDataSnapshot {
  equipamentos: Equipamento[];
  manutencoes: Manutencao[];
  responsaveis: Responsavel[];
  setores: Setor[];
  tiposEquipamento: TipoEquipamento[];
  termos: Termo[];
  termoModelos: TermoModelo[];
  radios: Radio[];
  frotas: Frota[];
  areasGeo: AreaGeo[];
  responsaveisGeo: ResponsavelGeo[];
  manutencoesRadios: ManutencaoRadio[];
  insumos: Insumo[];
  savedAt: string;
}

const KEY = 'snapshot';

/** Último conjunto de dados obtido com sucesso do servidor — usado para
 * abrir o app já com conteúdo quando não há rede disponível. Os campos de
 * Geotecnologia usam fallback `[]` porque um snapshot salvo antes dessas
 * chaves existirem não as teria. */
export async function loadSnapshot(): Promise<AppDataSnapshot | null> {
  const snap = await loadJson<Partial<AppDataSnapshot> | null>(KEY, null);
  if (!snap) return null;
  return {
    equipamentos: [], manutencoes: [], responsaveis: [], setores: [], tiposEquipamento: [],
    termos: [], termoModelos: [], radios: [], frotas: [], areasGeo: [], responsaveisGeo: [],
    manutencoesRadios: [], insumos: [], savedAt: '',
    ...snap,
  };
}

export async function saveSnapshot(snapshot: Omit<AppDataSnapshot, 'savedAt'>): Promise<void> {
  await saveJson(KEY, { ...snapshot, savedAt: new Date().toISOString() });
}
