import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../api/client';
import { EditarEquipamentoInput, NovaManutencaoInput, NovoEquipamentoInput, NovoTermoInput, repository } from '../data/repository';
import { Atividade, Equipamento, Manutencao, Responsavel, Setor, Termo, TermoModelo, TipoEquipamento } from '../types/models';
import { warrantyInfo, WarrantyInfo } from '../utils/format';
import { notifyGarantiasVencendo } from '../utils/notifications';
import { loadSnapshot, saveSnapshot } from '../offline/cache';
import { enqueue, init as initSyncEngine, onProgress, cancelPendingCreate } from '../offline/syncEngine';
import { useAuth } from './AuthContext';
import { usePreferences } from './PreferencesContext';
import { useToast } from './ToastContext';

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

function isNetworkError(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 0;
}

/** Id local negativo para um registro criado offline, até o servidor confirmar
 * o id real — -Date.now() é único o bastante pra esse fluxo (um humano
 * preenchendo um formulário não consegue salvar duas vezes no mesmo ms). */
function nextTempId(): number {
  return -Date.now();
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const { preferences } = usePreferences();
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [tiposEquipamento, setTiposEquipamento] = useState<TipoEquipamento[]>([]);
  const [termos, setTermos] = useState<Termo[]>([]);
  const [termoModelos, setTermoModelos] = useState<TermoModelo[]>([]);
  const hadUserRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
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
      await saveSnapshot({ equipamentos: eq, manutencoes: mn, responsaveis: resp, setores: set, tiposEquipamento: tipos, termos: term, termoModelos: termMod });
    } catch (err) {
      if (isNetworkError(err)) {
        showToast('Sem conexão — mostrando os últimos dados salvos.');
        return;
      }
      throw err;
    }
  }, [showToast]);

  // A fila de sincronização offline sobrevive a reinícios do app e a
  // trocas de sessão — inicializa uma vez e busca dados novos do servidor
  // sempre que ela conseguir enviar algo pendente.
  useEffect(() => {
    void initSyncEngine();
    return onProgress(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    if (!usuario) {
      setReady(false);
      if (hadUserRef.current) {
        // Logout de verdade — limpa para não misturar dados de sessões diferentes.
        setEquipamentos([]);
        setManutencoes([]);
        setResponsaveis([]);
        setSetores([]);
        setTiposEquipamento([]);
        setTermos([]);
        setTermoModelos([]);
      }
      return;
    }
    hadUserRef.current = true;
    (async () => {
      setReady(false);
      const snap = await loadSnapshot();
      if (snap) {
        setEquipamentos(snap.equipamentos);
        setManutencoes(snap.manutencoes);
        setResponsaveis(snap.responsaveis);
        setSetores(snap.setores);
        setTiposEquipamento(snap.tiposEquipamento);
        setTermos(snap.termos);
        setTermoModelos(snap.termoModelos);
        setReady(true);
      }
      await refresh();
      setReady(true);
    })();
  }, [usuario, refresh]);

  function resolveEquipamentoRefs(input: { tipoId: number; setorId?: number | null; responsavelId?: number | null }) {
    const tipo =
      tiposEquipamento.find((t) => t.id === input.tipoId) ??
      ({ id: input.tipoId, nome: '—', prefixoHostname: null, ativo: true } as TipoEquipamento);
    const setor = input.setorId ? setores.find((s) => s.id === input.setorId) ?? null : null;
    const responsavelFull = input.responsavelId ? responsaveis.find((r) => r.id === input.responsavelId) : undefined;
    const responsavel = responsavelFull ? { id: responsavelFull.id, nome: responsavelFull.nome } : null;
    return { tipo, setor, responsavel };
  }

  const criarEquipamento = useCallback(
    async (input: NovoEquipamentoInput) => {
      try {
        const created = await repository.createEquipamento(input);
        await refresh();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const tempId = nextTempId();
        const { tipo, setor, responsavel } = resolveEquipamentoRefs(input);
        const now = new Date().toISOString();
        const optimistic: Equipamento = {
          id: tempId,
          tipo,
          modelo: input.modelo.trim(),
          serial: input.serial.trim().toUpperCase(),
          hostname: input.hostname ? input.hostname.trim().toUpperCase() : null,
          imei: input.imei ? input.imei.trim() : null,
          setor,
          fornecedor: null,
          responsavel,
          status: input.status,
          dataAquisicao: input.dataAquisicao || null,
          dataGarantia: input.dataGarantia || null,
          fotoUrl: null,
          observacoes: input.observacoes || null,
          createdAt: now,
          updatedAt: now,
          pendingSync: true,
        };
        setEquipamentos((prev) => [optimistic, ...prev]);
        enqueue({ kind: 'criarEquipamento', tempId, input });
        showToast('Sem conexão — o equipamento será enviado automaticamente quando a rede voltar.');
        return optimistic;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, showToast, tiposEquipamento, setores, responsaveis]
  );

  const editarEquipamento = useCallback(
    async (id: number, input: EditarEquipamentoInput) => {
      try {
        const updated = await repository.updateEquipamento(id, input);
        await refresh();
        return updated;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const existing = equipamentos.find((e) => e.id === id);
        const { tipo, setor, responsavel } = resolveEquipamentoRefs(input);
        const optimistic: Equipamento = {
          ...(existing as Equipamento),
          id,
          tipo,
          modelo: input.modelo.trim(),
          serial: input.serial.trim().toUpperCase(),
          hostname: input.hostname ? input.hostname.trim().toUpperCase() : null,
          imei: input.imei ? input.imei.trim() : null,
          setor,
          responsavel,
          status: input.status,
          dataAquisicao: input.dataAquisicao || null,
          dataGarantia: input.dataGarantia || null,
          observacoes: input.observacoes || null,
          updatedAt: new Date().toISOString(),
          pendingSync: true,
        };
        setEquipamentos((prev) => prev.map((e) => (e.id === id ? optimistic : e)));
        enqueue({ kind: 'editarEquipamento', equipamentoId: id, input });
        showToast('Sem conexão — a edição será enviada automaticamente quando a rede voltar.');
        return optimistic;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, showToast, equipamentos, tiposEquipamento, setores, responsaveis]
  );

  const abrirOs = useCallback(
    async (input: NovaManutencaoInput) => {
      try {
        const created = await repository.createManutencao(input);
        await refresh();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const tempId = nextTempId();
        const equipamento = equipamentos.find((e) => e.id === input.equipamentoId);
        const now = new Date().toISOString();
        const optimistic: Manutencao = {
          id: tempId,
          os: 'Pendente',
          equipamento: equipamento
            ? { id: equipamento.id, serial: equipamento.serial, modelo: equipamento.modelo }
            : { id: input.equipamentoId, serial: '—', modelo: '—' },
          titulo: input.titulo.trim(),
          tipo: input.tipo,
          tecnico: input.tecnico?.trim() || null,
          custo: null,
          descricao: null,
          data: now,
          status: 'Aberta',
          createdAt: now,
          updatedAt: now,
          pendingSync: true,
        };
        setManutencoes((prev) => [optimistic, ...prev]);
        enqueue({ kind: 'abrirOs', tempId, input });
        showToast('Sem conexão — a OS será enviada automaticamente quando a rede voltar.');
        return optimistic;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, showToast, equipamentos]
  );

  const criarTermo = useCallback(
    async (input: NovoTermoInput) => {
      try {
        const created = await repository.createTermo(input);
        await refresh();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const tempId = nextTempId();
        const equipamento = equipamentos.find((e) => e.id === input.equipamentoId);
        const responsavel = input.responsavelId ? responsaveis.find((r) => r.id === input.responsavelId) : undefined;
        const modelo = input.modeloId ? termoModelos.find((m) => m.id === input.modeloId) : undefined;
        const now = new Date().toISOString();
        const optimistic: Termo = {
          id: tempId,
          numero: 'Pendente',
          colaborador: input.colaborador.trim(),
          cargo: input.cargo?.trim() || null,
          data: now,
          observacoes: input.observacoes?.trim() || null,
          assinado: false,
          dataAssinatura: null,
          devolvido: false,
          dataDevolucao: null,
          modelo: modelo ? { id: modelo.id, nome: modelo.nome, texto: modelo.texto, temArquivo: modelo.temArquivo } : null,
          responsavel: responsavel
            ? { id: responsavel.id, nome: responsavel.nome, cpf: responsavel.cpf, matricula: responsavel.matricula, setor: null }
            : null,
          equipamentos: equipamento
            ? [{ id: equipamento.id, serial: equipamento.serial, modelo: equipamento.modelo, hostname: equipamento.hostname, imei: equipamento.imei, tipo: equipamento.tipo.nome }]
            : [],
          createdAt: now,
          updatedAt: now,
          pendingSync: true,
        };
        setTermos((prev) => [optimistic, ...prev]);
        enqueue({ kind: 'criarTermo', tempId, input });
        showToast('Sem conexão — o termo será enviado automaticamente quando a rede voltar.');
        return optimistic;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, showToast, equipamentos, responsaveis, termoModelos]
  );

  const alternarAssinaturaTermo = useCallback(
    async (id: number, assinado: boolean) => {
      if (id < 0) {
        showToast('Aguarde a sincronização deste termo antes de alterar a assinatura.');
        return termos.find((t) => t.id === id)!;
      }
      try {
        const updated = await repository.setTermoAssinatura(id, assinado);
        await refresh();
        return updated;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const now = new Date().toISOString();
        setTermos((prev) => prev.map((t) => (t.id === id ? { ...t, assinado, dataAssinatura: assinado ? now : null, pendingSync: true } : t)));
        enqueue({ kind: 'alternarAssinaturaTermo', termoId: id, assinado });
        showToast('Sem conexão — a alteração será enviada automaticamente quando a rede voltar.');
        return termos.find((t) => t.id === id)!;
      }
    },
    [refresh, showToast, termos]
  );

  const alternarDevolucaoTermo = useCallback(
    async (id: number, devolvido: boolean) => {
      if (id < 0) {
        showToast('Aguarde a sincronização deste termo antes de alterar a devolução.');
        return termos.find((t) => t.id === id)!;
      }
      try {
        const updated = await repository.setTermoDevolucao(id, devolvido);
        await refresh();
        return updated;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const now = new Date().toISOString();
        setTermos((prev) => prev.map((t) => (t.id === id ? { ...t, devolvido, dataDevolucao: devolvido ? now : null, pendingSync: true } : t)));
        enqueue({ kind: 'alternarDevolucaoTermo', termoId: id, devolvido });
        showToast('Sem conexão — a alteração será enviada automaticamente quando a rede voltar.');
        return termos.find((t) => t.id === id)!;
      }
    },
    [refresh, showToast, termos]
  );

  const excluirTermo = useCallback(
    async (id: number) => {
      if (id < 0) {
        // Termo criado offline e ainda não sincronizado — não existe no
        // servidor, então basta cancelar a criação enfileirada.
        await cancelPendingCreate('termo', id);
        setTermos((prev) => prev.filter((t) => t.id !== id));
        return;
      }
      try {
        await repository.deleteTermo(id);
        await refresh();
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        setTermos((prev) => prev.filter((t) => t.id !== id));
        enqueue({ kind: 'excluirTermo', termoId: id });
        showToast('Sem conexão — a exclusão será enviada automaticamente quando a rede voltar.');
      }
    },
    [refresh, showToast]
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
