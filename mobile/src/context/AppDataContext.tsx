import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../api/client';
import {
  EditarEquipamentoInput,
  EditarRadioInput,
  NovaManutencaoInput,
  NovaManutencaoRadioInput,
  NovoEquipamentoInput,
  NovoRadioInput,
  NovoTermoInput,
  repository,
} from '../data/repository';
import {
  AreaGeo,
  Atividade,
  Equipamento,
  Frota,
  Insumo,
  ManutencaoRadio,
  Manutencao,
  Radio,
  Responsavel,
  ResponsavelGeo,
  Setor,
  StatusManutencao,
  Termo,
  TermoModelo,
  TipoEquipamento,
} from '../types/models';
import { warrantyInfo, WarrantyInfo } from '../utils/format';
import { notifyGarantiasVencendo, notifyNovasOsRadios } from '../utils/notifications';
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
  radios: Radio[];
  frotas: Frota[];
  areasGeo: AreaGeo[];
  responsaveisGeo: ResponsavelGeo[];
  insumos: Insumo[];
  manutencoesRadios: ManutencaoRadio[];
  atividades: Atividade[];
  garantiasVencendo: GarantiaVencendo[];
  refresh: () => Promise<void>;
  getEquipamento: (id: number) => Equipamento | undefined;
  getManutencoesDe: (equipamentoId: number) => Manutencao[];
  criarEquipamento: (input: NovoEquipamentoInput) => Promise<Equipamento>;
  editarEquipamento: (id: number, input: EditarEquipamentoInput) => Promise<Equipamento>;
  excluirEquipamento: (id: number) => Promise<void>;
  abrirOs: (input: NovaManutencaoInput) => Promise<Manutencao>;
  alterarStatusOs: (id: number, status: StatusManutencao) => Promise<Manutencao>;
  alternarAssinaturaTermo: (id: number, assinado: boolean) => Promise<Termo>;
  alternarDevolucaoTermo: (id: number, devolvido: boolean) => Promise<Termo>;
  criarTermo: (input: NovoTermoInput) => Promise<Termo>;
  excluirTermo: (id: number) => Promise<void>;
  getRadio: (id: number) => Radio | undefined;
  getManutencoesRadioDe: (radioId: number) => ManutencaoRadio[];
  criarRadio: (input: NovoRadioInput) => Promise<Radio>;
  editarRadio: (id: number, input: EditarRadioInput) => Promise<Radio>;
  excluirRadio: (id: number) => Promise<void>;
  abrirOsRadio: (input: NovaManutencaoRadioInput) => Promise<ManutencaoRadio>;
  alterarStatusOsRadio: (id: number, status: StatusManutencao, insumoIds?: number[]) => Promise<ManutencaoRadio>;
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
  const [radios, setRadios] = useState<Radio[]>([]);
  const [frotas, setFrotas] = useState<Frota[]>([]);
  const [areasGeo, setAreasGeo] = useState<AreaGeo[]>([]);
  const [responsaveisGeo, setResponsaveisGeo] = useState<ResponsavelGeo[]>([]);
  const [manutencoesRadios, setManutencoesRadios] = useState<ManutencaoRadio[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const hadUserRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [eq, mn, resp, set, tipos, term, termMod, rad, frt, areaG, respG, mnRad, ins] = await Promise.all([
        repository.listEquipamentos(),
        repository.listManutencoes(),
        repository.listResponsaveis(),
        repository.listSetores(),
        repository.listTiposEquipamento(),
        repository.listTermos(),
        repository.listTermoModelos(),
        repository.listRadios(),
        repository.listFrotas(),
        repository.listAreasGeo(),
        repository.listResponsaveisGeo(),
        repository.listManutencoesRadios(),
        repository.listInsumos(),
      ]);
      setEquipamentos(eq);
      setManutencoes(mn);
      setResponsaveis(resp);
      setSetores(set);
      setTiposEquipamento(tipos);
      setTermos(term);
      setTermoModelos(termMod);
      setRadios(rad);
      setFrotas(frt);
      setAreasGeo(areaG);
      setResponsaveisGeo(respG);
      setManutencoesRadios(mnRad);
      setInsumos(ins);
      await saveSnapshot({
        equipamentos: eq, manutencoes: mn, responsaveis: resp, setores: set, tiposEquipamento: tipos,
        termos: term, termoModelos: termMod, radios: rad, frotas: frt, areasGeo: areaG,
        responsaveisGeo: respG, manutencoesRadios: mnRad, insumos: ins,
      });
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
        setRadios([]);
        setFrotas([]);
        setAreasGeo([]);
        setResponsaveisGeo([]);
        setManutencoesRadios([]);
        setInsumos([]);
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
        setRadios(snap.radios);
        setFrotas(snap.frotas);
        setAreasGeo(snap.areasGeo);
        setResponsaveisGeo(snap.responsaveisGeo);
        setManutencoesRadios(snap.manutencoesRadios);
        setInsumos(snap.insumos);
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

  const excluirEquipamento = useCallback(
    async (id: number) => {
      if (id < 0) {
        // Equipamento criado offline e ainda não sincronizado — não existe no
        // servidor, então basta cancelar a criação enfileirada.
        await cancelPendingCreate('equipamento', id);
        setEquipamentos((prev) => prev.filter((e) => e.id !== id));
        return;
      }
      try {
        await repository.deleteEquipamento(id);
        await refresh();
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        setEquipamentos((prev) => prev.filter((e) => e.id !== id));
        enqueue({ kind: 'excluirEquipamento', equipamentoId: id });
        showToast('Sem conexão — a exclusão será enviada automaticamente quando a rede voltar.');
      }
    },
    [refresh, showToast]
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

  function resolveRadioRefs(input: { frotaId?: number | null; areaId?: number | null; responsavelId?: number | null }) {
    const frota = input.frotaId ? frotas.find((f) => f.id === input.frotaId) ?? null : null;
    const area = input.areaId ? areasGeo.find((a) => a.id === input.areaId) ?? null : null;
    const responsavelFull = input.responsavelId ? responsaveisGeo.find((r) => r.id === input.responsavelId) : undefined;
    const responsavel = responsavelFull ? { id: responsavelFull.id, nome: responsavelFull.nome } : null;
    return { frota, area, responsavel };
  }

  const criarRadio = useCallback(
    async (input: NovoRadioInput) => {
      try {
        const created = await repository.createRadio(input);
        await refresh();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const tempId = nextTempId();
        const { frota, area, responsavel } = resolveRadioRefs(input);
        const now = new Date().toISOString();
        const optimistic: Radio = {
          id: tempId,
          numeroSerie: input.numeroSerie.trim().toUpperCase(),
          modelo: input.modelo ? input.modelo.trim() : null,
          idDigital: input.idDigital ? input.idDigital.trim() : null,
          idAnalogico: input.idAnalogico ? input.idAnalogico.trim() : null,
          tipo: input.tipo || null,
          colaboradorResponsavel: input.colaboradorResponsavel ? input.colaboradorResponsavel.trim() : null,
          codigo: input.codigo ? input.codigo.trim() : null,
          frota,
          area,
          responsavel,
          status: input.status,
          dataAquisicao: input.dataAquisicao || null,
          observacoes: input.observacoes || null,
          createdAt: now,
          updatedAt: now,
          pendingSync: true,
        };
        setRadios((prev) => [optimistic, ...prev]);
        enqueue({ kind: 'criarRadio', tempId, input });
        showToast('Sem conexão — o rádio será enviado automaticamente quando a rede voltar.');
        return optimistic;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, showToast, frotas, areasGeo, responsaveisGeo]
  );

  const editarRadio = useCallback(
    async (id: number, input: EditarRadioInput) => {
      try {
        const updated = await repository.updateRadio(id, input);
        await refresh();
        return updated;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const existing = radios.find((r) => r.id === id);
        const { frota, area, responsavel } = resolveRadioRefs(input);
        const optimistic: Radio = {
          ...(existing as Radio),
          id,
          numeroSerie: input.numeroSerie.trim().toUpperCase(),
          modelo: input.modelo ? input.modelo.trim() : null,
          idDigital: input.idDigital ? input.idDigital.trim() : null,
          idAnalogico: input.idAnalogico ? input.idAnalogico.trim() : null,
          tipo: input.tipo || null,
          colaboradorResponsavel: input.colaboradorResponsavel ? input.colaboradorResponsavel.trim() : null,
          codigo: input.codigo ? input.codigo.trim() : null,
          frota,
          area,
          responsavel,
          status: input.status,
          dataAquisicao: input.dataAquisicao || null,
          observacoes: input.observacoes || null,
          updatedAt: new Date().toISOString(),
          pendingSync: true,
        };
        setRadios((prev) => prev.map((r) => (r.id === id ? optimistic : r)));
        enqueue({ kind: 'editarRadio', radioId: id, input });
        showToast('Sem conexão — a edição será enviada automaticamente quando a rede voltar.');
        return optimistic;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, showToast, radios, frotas, areasGeo, responsaveisGeo]
  );

  const excluirRadio = useCallback(
    async (id: number) => {
      if (id < 0) {
        // Rádio criado offline e ainda não sincronizado — não existe no
        // servidor, então basta cancelar a criação enfileirada.
        await cancelPendingCreate('radio', id);
        setRadios((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      try {
        await repository.deleteRadio(id);
        await refresh();
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        setRadios((prev) => prev.filter((r) => r.id !== id));
        enqueue({ kind: 'excluirRadio', radioId: id });
        showToast('Sem conexão — a exclusão será enviada automaticamente quando a rede voltar.');
      }
    },
    [refresh, showToast]
  );

  const abrirOsRadio = useCallback(
    async (input: NovaManutencaoRadioInput) => {
      try {
        const created = await repository.createManutencaoRadio(input);
        await refresh();
        return created;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const tempId = nextTempId();
        const radio = input.radioId !== undefined ? radios.find((r) => r.id === input.radioId) : undefined;
        const frota = input.frotaId !== undefined ? frotas.find((f) => f.id === input.frotaId) : undefined;
        const now = new Date().toISOString();
        const optimistic: ManutencaoRadio = {
          id: tempId,
          os: 'Pendente',
          radio: radio ? { id: radio.id, numeroSerie: radio.numeroSerie, modelo: radio.modelo } : null,
          frota: frota ? { id: frota.id, numero: frota.numero, nome: frota.nome } : null,
          insumos: [],
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
        setManutencoesRadios((prev) => [optimistic, ...prev]);
        enqueue({ kind: 'abrirOsRadio', tempId, input });
        showToast('Sem conexão — a OS será enviada automaticamente quando a rede voltar.');
        return optimistic;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh, showToast, radios, frotas]
  );

  const alterarStatusOs = useCallback(
    async (id: number, status: StatusManutencao) => {
      if (id < 0) {
        showToast('Aguarde a sincronização desta OS antes de alterar o status.');
        return manutencoes.find((m) => m.id === id)!;
      }
      try {
        const updated = await repository.updateManutencaoStatus(id, status);
        await refresh();
        return updated;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        setManutencoes((prev) => prev.map((m) => (m.id === id ? { ...m, status, pendingSync: true } : m)));
        enqueue({ kind: 'alterarStatusOs', manutencaoId: id, status });
        showToast('Sem conexão — a alteração será enviada automaticamente quando a rede voltar.');
        return manutencoes.find((m) => m.id === id)!;
      }
    },
    [refresh, showToast, manutencoes]
  );

  const alterarStatusOsRadio = useCallback(
    async (id: number, status: StatusManutencao, insumoIds?: number[]) => {
      if (id < 0) {
        showToast('Aguarde a sincronização desta OS antes de alterar o status.');
        return manutencoesRadios.find((m) => m.id === id)!;
      }
      try {
        const updated = await repository.updateManutencaoRadioStatus(id, status, insumoIds);
        await refresh();
        return updated;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        setManutencoesRadios((prev) => prev.map((m) => (m.id === id ? { ...m, status, pendingSync: true } : m)));
        enqueue({ kind: 'alterarStatusOsRadio', manutencaoRadioId: id, status, insumoIds });
        showToast('Sem conexão — a alteração será enviada automaticamente quando a rede voltar.');
        return manutencoesRadios.find((m) => m.id === id)!;
      }
    },
    [refresh, showToast, manutencoesRadios]
  );

  const getEquipamento = useCallback((id: number) => equipamentos.find((e) => e.id === id), [equipamentos]);

  const getManutencoesDe = useCallback(
    (equipamentoId: number) => manutencoes.filter((m) => m.equipamento.id === equipamentoId),
    [manutencoes]
  );

  const getRadio = useCallback((id: number) => radios.find((r) => r.id === id), [radios]);

  const getManutencoesRadioDe = useCallback(
    (radioId: number) => manutencoesRadios.filter((m) => m.radio?.id === radioId),
    [manutencoesRadios]
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

  useEffect(() => {
    if (!preferences.notificacoesPush) return;
    const sincronizadas = manutencoesRadios.filter((m) => m.id > 0);
    if (sincronizadas.length === 0) return;
    notifyNovasOsRadios(
      sincronizadas.map((m) => ({
        id: m.id,
        os: m.os,
        referencia: m.radio ? m.radio.numeroSerie : m.frota ? `Frota ${m.frota.numero}` : '',
      }))
    );
  }, [manutencoesRadios, preferences.notificacoesPush]);

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
      radios,
      frotas,
      areasGeo,
      responsaveisGeo,
      manutencoesRadios,
      insumos,
      atividades,
      garantiasVencendo,
      refresh,
      getEquipamento,
      getManutencoesDe,
      criarEquipamento,
      editarEquipamento,
      excluirEquipamento,
      abrirOs,
      alterarStatusOs,
      alternarAssinaturaTermo,
      alternarDevolucaoTermo,
      criarTermo,
      excluirTermo,
      getRadio,
      getManutencoesRadioDe,
      criarRadio,
      editarRadio,
      excluirRadio,
      abrirOsRadio,
      alterarStatusOsRadio,
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
      radios,
      frotas,
      areasGeo,
      responsaveisGeo,
      manutencoesRadios,
      insumos,
      atividades,
      garantiasVencendo,
      refresh,
      getEquipamento,
      getManutencoesDe,
      criarEquipamento,
      editarEquipamento,
      excluirEquipamento,
      abrirOs,
      alterarStatusOs,
      alternarAssinaturaTermo,
      alternarDevolucaoTermo,
      criarTermo,
      excluirTermo,
      getRadio,
      getManutencoesRadioDe,
      criarRadio,
      editarRadio,
      excluirRadio,
      abrirOsRadio,
      alterarStatusOsRadio,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de AppDataProvider');
  return ctx;
}
