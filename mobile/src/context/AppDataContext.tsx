import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EditarEquipamentoInput, NovaManutencaoInput, NovoEquipamentoInput, NovoTermoInput, repository } from '../data/repository';
import { Atividade, Equipamento, Manutencao, Responsavel, Setor, Termo, TermoModelo, TipoEquipamento } from '../types/models';
import { warrantyInfo, WarrantyInfo } from '../utils/format';
import { notifyGarantiasVencendo } from '../utils/notifications';
import { useAuth } from './AuthContext';
import { usePreferences } from './PreferencesContext';

export interface GarantiaVencendo {
  equipamento: Equipamento;
  warranty: WarrantyInfo;
}

interface AppDataContextValue {
  ready: boolean;
  equipamentos: Equipamento[];
  manutencoes: Manutencao[];
  responsaveis: Responsavel[];
  setores: Setor[];
  tiposEquipamento: TipoEquipamento[];
  termos: Termo[];
  termoModelos: TermoModelo[];
  atividades: Atividade[];
  garantiasVencendo: GarantiaVencendo[];
  refresh: () => Promise<void>;
  getEquipamento: (id: number) => Equipamento | undefined;
  getManutencoesDe: (equipamentoId: number) => Manutencao[];
  criarEquipamento: (input: NovoEquipamentoInput) => Promise<Equipamento>;
  editarEquipamento: (id: number, input: EditarEquipamentoInput) => Promise<Equipamento>;
  abrirOs: (input: NovaManutencaoInput) => Promise<Manutencao>;
  alternarAssinaturaTermo: (id: number, assinado: boolean) => Promise<Termo>;
  alternarDevolucaoTermo: (id: number, devolvido: boolean) => Promise<Termo>;
  criarTermo: (input: NovoTermoInput) => Promise<Termo>;
  excluirTermo: (id: number) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function buildAtividades(equipamentos: Equipamento[], manutencoes: Manutencao[]): Atividade[] {
  const items: Atividade[] = [];

  for (const e of equipamentos) {
    items.push({
      id: `equip-${e.id}`,
      texto: `${e.modelo} (${e.serial}) adicionado ao inventário`,
      autor: e.responsavel?.nome || 'Sistema',
      data: e.createdAt,
      cor: 'accent',
    });
  }
  for (const m of manutencoes) {
    items.push({
      id: `os-${m.id}`,
      texto:
        m.status === 'Concluida'
          ? `${m.os} concluída — ${m.equipamento.serial}`
          : `${m.os} aberta para ${m.equipamento.serial} (${m.titulo})`,
      autor: m.tecnico || 'Sistema',
      data: m.createdAt,
      cor: m.status === 'Concluida' ? 'accent' : 'warning',
    });
  }

  return items.sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 20);
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const { preferences } = usePreferences();
  const [ready, setReady] = useState(false);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamento[]>([]);
  const [termos, setTermos] = useState<Termo[]>([]);
  const [termoModelos, setTermoModelos] = useState<TermoModelo[]>([]);

  const refresh = useCallback(async () => {
    const [eq, mn, resp, set, tipos, term, termMod] = await Promise.all([
      repository.listEquipamentos(),
      repository.listManutencoes(),
      repository.listResponsaveis(),
      repository.listSetores(),
      repository.listTiposEquipamento(),
      repository.listTermos(),
      repository.listTermoModelos(),
    ]);
    setEquipamentos(eq);
    setManutencoes(mn);
    setResponsaveis(resp);
    setSetores(set);
    setTiposEquipamento(tipos);
    setTermos(term);
    setTermoModelos(termMod);
  }, []);

  useEffect(() => {
    if (!usuario) {
      setReady(false);
      setEquipamentos([]);
      setManutencoes([]);
      setResponsaveis([]);
      setSetores([]);
      setTiposEquipamento([]);
      setTermos([]);
      setTermoModelos([]);
      return;
    }
    (async () => {
      setReady(false);
      await refresh();
      setReady(true);
    })();
  }, [usuario, refresh]);

  const criarEquipamento = useCallback(
    async (input: NovoEquipamentoInput) => {
      const created = await repository.createEquipamento(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const editarEquipamento = useCallback(
    async (id: number, input: EditarEquipamentoInput) => {
      const updated = await repository.updateEquipamento(id, input);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const abrirOs = useCallback(
    async (input: NovaManutencaoInput) => {
      const created = await repository.createManutencao(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const alternarAssinaturaTermo = useCallback(
    async (id: number, assinado: boolean) => {
      const updated = await repository.setTermoAssinatura(id, assinado);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const criarTermo = useCallback(
    async (input: NovoTermoInput) => {
      const created = await repository.createTermo(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const alternarDevolucaoTermo = useCallback(
    async (id: number, devolvido: boolean) => {
      const updated = await repository.setTermoDevolucao(id, devolvido);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const excluirTermo = useCallback(
    async (id: number) => {
      await repository.deleteTermo(id);
      await refresh();
    },
    [refresh]
  );

  const getEquipamento = useCallback((id: number) => equipamentos.find((e) => e.id === id), [equipamentos]);

  const getManutencoesDe = useCallback(
    (equipamentoId: number) => manutencoes.filter((m) => m.equipamento.id === equipamentoId),
    [manutencoes]
  );

  const atividades = useMemo(() => buildAtividades(equipamentos, manutencoes), [equipamentos, manutencoes]);

  const garantiasVencendo = useMemo<GarantiaVencendo[]>(() => {
    return equipamentos
      .map((equipamento) => ({ equipamento, warranty: warrantyInfo(equipamento.dataAquisicao, equipamento.dataGarantia) }))
      .filter(({ warranty }) => warranty.days !== null && warranty.days >= 0 && warranty.days <= 120)
      .sort((a, b) => (a.warranty.days ?? 0) - (b.warranty.days ?? 0));
  }, [equipamentos]);

  useEffect(() => {
    if (!preferences.alertasGarantia || !preferences.notificacoesPush) return;
    if (garantiasVencendo.length === 0) return;
    notifyGarantiasVencendo(
      garantiasVencendo.map(({ equipamento, warranty }) => ({
        id: equipamento.id,
        serial: equipamento.serial,
        modelo: equipamento.modelo,
        dias: warranty.days ?? 0,
      }))
    );
  }, [garantiasVencendo, preferences.alertasGarantia, preferences.notificacoesPush]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
      equipamentos,
      manutencoes,
      responsaveis,
      setores,
      tiposEquipamento,
      termos,
      termoModelos,
      atividades,
      garantiasVencendo,
      refresh,
      getEquipamento,
      getManutencoesDe,
      criarEquipamento,
      editarEquipamento,
      abrirOs,
      alternarAssinaturaTermo,
      alternarDevolucaoTermo,
      criarTermo,
      excluirTermo,
    }),
    [
      ready,
      equipamentos,
      manutencoes,
      responsaveis,
      setores,
      tiposEquipamento,
      termos,
      termoModelos,
      atividades,
      garantiasVencendo,
      refresh,
      getEquipamento,
      getManutencoesDe,
      criarEquipamento,
      editarEquipamento,
      abrirOs,
      alternarAssinaturaTermo,
      alternarDevolucaoTermo,
      criarTermo,
      excluirTermo,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de AppDataProvider');
  return ctx;
}
