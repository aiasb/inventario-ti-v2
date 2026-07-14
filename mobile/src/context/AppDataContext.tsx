import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EditarEquipamentoInput, NovaManutencaoInput, NovoEquipamentoInput, repository } from '../data/repository';
import { Atividade, Equipamento, Manutencao, Responsavel, Setor, TipoEquipamento } from '../types/models';
import { useAuth } from './AuthContext';

interface AppDataContextValue {
  ready: boolean;
  equipamentos: Equipamento[];
  manutencoes: Manutencao[];
  responsaveis: Responsavel[];
  setores: Setor[];
  tiposEquipamento: TipoEquipamento[];
  atividades: Atividade[];
  refresh: () => Promise<void>;
  getEquipamento: (id: number) => Equipamento | undefined;
  getManutencoesDe: (equipamentoId: number) => Manutencao[];
  criarEquipamento: (input: NovoEquipamentoInput) => Promise<Equipamento>;
  editarEquipamento: (id: number, input: EditarEquipamentoInput) => Promise<Equipamento>;
  abrirOs: (input: NovaManutencaoInput) => Promise<Manutencao>;
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
  const [ready, setReady] = useState(false);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamento[]>([]);

  const refresh = useCallback(async () => {
    const [eq, mn, resp, set, tipos] = await Promise.all([
      repository.listEquipamentos(),
      repository.listManutencoes(),
      repository.listResponsaveis(),
      repository.listSetores(),
      repository.listTiposEquipamento(),
    ]);
    setEquipamentos(eq);
    setManutencoes(mn);
    setResponsaveis(resp);
    setSetores(set);
    setTiposEquipamento(tipos);
  }, []);

  useEffect(() => {
    if (!usuario) {
      setReady(false);
      setEquipamentos([]);
      setManutencoes([]);
      setResponsaveis([]);
      setSetores([]);
      setTiposEquipamento([]);
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

  const getEquipamento = useCallback((id: number) => equipamentos.find((e) => e.id === id), [equipamentos]);

  const getManutencoesDe = useCallback(
    (equipamentoId: number) => manutencoes.filter((m) => m.equipamento.id === equipamentoId),
    [manutencoes]
  );

  const atividades = useMemo(() => buildAtividades(equipamentos, manutencoes), [equipamentos, manutencoes]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
      equipamentos,
      manutencoes,
      responsaveis,
      setores,
      tiposEquipamento,
      atividades,
      refresh,
      getEquipamento,
      getManutencoesDe,
      criarEquipamento,
      editarEquipamento,
      abrirOs,
    }),
    [
      ready,
      equipamentos,
      manutencoes,
      responsaveis,
      setores,
      tiposEquipamento,
      atividades,
      refresh,
      getEquipamento,
      getManutencoesDe,
      criarEquipamento,
      editarEquipamento,
      abrirOs,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de AppDataProvider');
  return ctx;
}
