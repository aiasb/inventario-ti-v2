import { api, qs } from '../api/client';
import {
  AreaGeo,
  Empresa,
  Equipamento,
  Fornecedor,
  Frota,
  Insumo,
  ManutencaoRadio,
  Manutencao,
  Perfil,
  Radio,
  Responsavel,
  ResponsavelGeo,
  Setor,
  StatusAtivo,
  StatusManutencao,
  Termo,
  TermoModelo,
  TipoEquipamento,
  UsuarioAdmin,
} from '../types/models';

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Quando presente, vai no header Idempotency-Key — a fila de sincronização
 * offline (mobile/src/offline) reenvia a mesma chave em cada retry, então o
 * servidor devolve a resposta original em vez de repetir o efeito. */
function idemHeaders(idempotencyKey?: string): Record<string, string> | undefined {
  return idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
}

export interface NovoEquipamentoInput {
  tipoId: number;
  modelo: string;
  serial: string;
  hostname?: string | null;
  imei?: string | null;
  responsavelId?: number | null;
  setorId?: number | null;
  status: 'Ativo' | 'Estoque';
  dataAquisicao?: string | null;
  dataGarantia?: string | null;
  observacoes?: string | null;
}

export type EditarEquipamentoInput = NovoEquipamentoInput;

export interface NovaManutencaoInput {
  equipamentoId: number;
  titulo: string;
  tipo: Manutencao['tipo'];
  tecnico?: string;
}

export interface NovoTermoInput {
  equipamentoId: number;
  colaborador: string;
  cargo?: string;
  responsavelId?: number | null;
  modeloId?: number | null;
  observacoes?: string | null;
}

export interface NovoRadioInput {
  numeroSerie: string;
  modelo?: string | null;
  idDigital?: string | null;
  idAnalogico?: string | null;
  frotaId?: number | null;
  areaId?: number | null;
  responsavelId?: number | null;
  status: 'Ativo' | 'Estoque';
  dataAquisicao?: string | null;
  observacoes?: string | null;
}

export type EditarRadioInput = NovoRadioInput;

export interface NovaManutencaoRadioInput {
  radioId?: number;
  frotaId?: number;
  titulo: string;
  tipo: ManutencaoRadio['tipo'];
  tecnico?: string;
}

function radioBody(input: NovoRadioInput) {
  return {
    numeroSerie: input.numeroSerie.trim().toUpperCase(),
    modelo: input.modelo ? input.modelo.trim() : null,
    idDigital: input.idDigital ? input.idDigital.trim() : null,
    idAnalogico: input.idAnalogico ? input.idAnalogico.trim() : null,
    frotaId: input.frotaId || null,
    areaId: input.areaId || null,
    responsavelId: input.responsavelId || null,
    status: input.status,
    dataAquisicao: input.dataAquisicao || null,
    observacoes: input.observacoes || null,
  };
}

function equipamentoBody(input: NovoEquipamentoInput) {
  return {
    tipoId: input.tipoId,
    modelo: input.modelo.trim(),
    serial: input.serial.trim().toUpperCase(),
    hostname: input.hostname ? input.hostname.trim().toUpperCase() : null,
    imei: input.imei ? input.imei.trim() : null,
    responsavelId: input.responsavelId || null,
    setorId: input.setorId || null,
    status: input.status,
    dataAquisicao: input.dataAquisicao || null,
    dataGarantia: input.dataGarantia || null,
    observacoes: input.observacoes || null,
  };
}

/**
 * Camada de acesso a dados do app — fala com a API REST real do backend
 * (mesmo backend do painel web), autenticada via /auth/login.
 */
class RemoteRepository {
  async listEquipamentos(): Promise<Equipamento[]> {
    const res = await api.get<Paginated<Equipamento>>(`/equipamentos${qs({ limit: 200, sort: '-updatedAt' })}`);
    return res.data;
  }

  async createEquipamento(input: NovoEquipamentoInput, idempotencyKey?: string): Promise<Equipamento> {
    return api.post<Equipamento>('/equipamentos', equipamentoBody(input), idemHeaders(idempotencyKey));
  }

  async updateEquipamento(id: number, input: EditarEquipamentoInput, idempotencyKey?: string): Promise<Equipamento> {
    return api.put<Equipamento>(`/equipamentos/${id}`, equipamentoBody(input), idemHeaders(idempotencyKey));
  }

  async deleteEquipamento(id: number, idempotencyKey?: string): Promise<void> {
    await api.delete(`/equipamentos/${id}`, idemHeaders(idempotencyKey));
  }

  async listManutencoes(equipamentoId?: number): Promise<Manutencao[]> {
    const res = await api.get<Paginated<Manutencao>>(
      `/manutencoes${qs({ limit: 200, equipamentoId, sort: '-data' })}`
    );
    return res.data;
  }

  async createManutencao(input: NovaManutencaoInput, idempotencyKey?: string): Promise<Manutencao> {
    return api.post<Manutencao>(
      '/manutencoes',
      {
        equipamentoId: input.equipamentoId,
        titulo: input.titulo.trim(),
        tipo: input.tipo,
        tecnico: input.tecnico?.trim() || null,
      },
      idemHeaders(idempotencyKey)
    );
  }

  async updateManutencaoStatus(id: number, status: StatusManutencao, idempotencyKey?: string): Promise<Manutencao> {
    return api.patch<Manutencao>(`/manutencoes/${id}/status`, { status }, idemHeaders(idempotencyKey));
  }

  // ---- Termos ---------------------------------------------------------------

  async listTermos(): Promise<Termo[]> {
    const res = await api.get<Paginated<Termo>>(`/termos${qs({ limit: 200, sort: '-data' })}`);
    return res.data;
  }

  async setTermoAssinatura(id: number, assinado: boolean, idempotencyKey?: string): Promise<Termo> {
    return api.patch<Termo>(`/termos/${id}/assinatura`, { assinado }, idemHeaders(idempotencyKey));
  }

  async setTermoDevolucao(id: number, devolvido: boolean, idempotencyKey?: string): Promise<Termo> {
    return api.patch<Termo>(`/termos/${id}/devolucao`, { devolvido }, idemHeaders(idempotencyKey));
  }

  async deleteTermo(id: number, idempotencyKey?: string): Promise<void> {
    await api.delete(`/termos/${id}`, idemHeaders(idempotencyKey));
  }

  async createTermo(input: NovoTermoInput, idempotencyKey?: string): Promise<Termo> {
    return api.post<Termo>(
      '/termos',
      {
        colaborador: input.colaborador.trim(),
        cargo: input.cargo?.trim() || null,
        equipamentoIds: [input.equipamentoId],
        responsavelId: input.responsavelId || null,
        modeloId: input.modeloId || null,
        observacoes: input.observacoes?.trim() || null,
      },
      idemHeaders(idempotencyKey)
    );
  }

  async listTermoModelos(): Promise<TermoModelo[]> {
    const res = await api.get<Paginated<TermoModelo>>(`/termo-modelos${qs({ limit: 200 })}`);
    return res.data;
  }

  // ---- Responsáveis ------------------------------------------------------

  async listResponsaveis(somenteAtivos = true): Promise<Responsavel[]> {
    const res = await api.get<Paginated<Responsavel>>(
      `/responsaveis${qs({ limit: 200, ativo: somenteAtivos || undefined })}`
    );
    return res.data;
  }

  async createResponsavel(input: { nome: string; matricula?: string | null; cpf?: string | null; setorId?: number | null }): Promise<Responsavel> {
    return api.post<Responsavel>('/responsaveis', input);
  }

  async updateResponsavel(id: number, input: Partial<{ nome: string; matricula: string | null; cpf: string | null; setorId: number | null; ativo: boolean }>): Promise<Responsavel> {
    return api.put<Responsavel>(`/responsaveis/${id}`, input);
  }

  async deleteResponsavel(id: number): Promise<void> {
    await api.delete(`/responsaveis/${id}`);
  }

  // ---- Setores ------------------------------------------------------------

  async listSetores(somenteAtivos = true): Promise<Setor[]> {
    const res = await api.get<Paginated<Setor>>(`/setores${qs({ limit: 200, ativo: somenteAtivos || undefined })}`);
    return res.data;
  }

  async createSetor(input: { nome: string }): Promise<Setor> {
    return api.post<Setor>('/setores', input);
  }

  async updateSetor(id: number, input: Partial<{ nome: string; ativo: boolean }>): Promise<Setor> {
    return api.put<Setor>(`/setores/${id}`, input);
  }

  async deleteSetor(id: number): Promise<void> {
    await api.delete(`/setores/${id}`);
  }

  // ---- Status (compartilhado TI/Geotecnologia) -------------------------------

  async listStatusAtivo(somenteAtivos = true): Promise<StatusAtivo[]> {
    const res = await api.get<Paginated<StatusAtivo>>(`/status-ativo${qs({ limit: 200, ativo: somenteAtivos || undefined })}`);
    return res.data;
  }

  async createStatusAtivo(input: { nome: string }): Promise<StatusAtivo> {
    return api.post<StatusAtivo>('/status-ativo', input);
  }

  async updateStatusAtivo(id: number, input: Partial<{ nome: string; ativo: boolean }>): Promise<StatusAtivo> {
    return api.put<StatusAtivo>(`/status-ativo/${id}`, input);
  }

  async deleteStatusAtivo(id: number): Promise<void> {
    await api.delete(`/status-ativo/${id}`);
  }

  // ---- Tipos de equipamento -------------------------------------------------

  async listTiposEquipamento(somenteAtivos = true): Promise<TipoEquipamento[]> {
    const res = await api.get<Paginated<TipoEquipamento>>(
      `/tipos-equipamento${qs({ limit: 200, ativo: somenteAtivos || undefined })}`
    );
    return res.data;
  }

  async createTipoEquipamento(input: { nome: string; prefixoHostname?: string | null }): Promise<TipoEquipamento> {
    return api.post<TipoEquipamento>('/tipos-equipamento', input);
  }

  async updateTipoEquipamento(id: number, input: Partial<{ nome: string; prefixoHostname: string | null; ativo: boolean }>): Promise<TipoEquipamento> {
    return api.put<TipoEquipamento>(`/tipos-equipamento/${id}`, input);
  }

  async deleteTipoEquipamento(id: number): Promise<void> {
    await api.delete(`/tipos-equipamento/${id}`);
  }

  // ---- Fornecedores -------------------------------------------------------

  async listFornecedores(somenteAtivos = true): Promise<Fornecedor[]> {
    const res = await api.get<Paginated<Fornecedor>>(
      `/fornecedores${qs({ limit: 200, ativo: somenteAtivos || undefined })}`
    );
    return res.data;
  }

  async createFornecedor(input: { nome: string; cnpj?: string | null; telefone?: string | null; email?: string | null }): Promise<Fornecedor> {
    return api.post<Fornecedor>('/fornecedores', input);
  }

  async updateFornecedor(id: number, input: Partial<{ nome: string; cnpj: string | null; telefone: string | null; email: string | null; ativo: boolean }>): Promise<Fornecedor> {
    return api.put<Fornecedor>(`/fornecedores/${id}`, input);
  }

  async deleteFornecedor(id: number): Promise<void> {
    await api.delete(`/fornecedores/${id}`);
  }

  // ---- Usuários (Acessos) --------------------------------------------------

  async listUsuarios(): Promise<UsuarioAdmin[]> {
    const res = await api.get<Paginated<UsuarioAdmin>>(`/usuarios${qs({ limit: 100, sort: 'nome' })}`);
    return res.data;
  }

  async createUsuario(input: { nome: string; email: string; senha: string; cargo?: string; perfilId: number; empresaIds?: number[] }): Promise<UsuarioAdmin> {
    return api.post<UsuarioAdmin>('/usuarios', input);
  }

  async updateUsuario(id: number, input: Partial<{ nome: string; email: string; senha: string; cargo: string; perfilId: number; empresaIds: number[] }>): Promise<UsuarioAdmin> {
    return api.put<UsuarioAdmin>(`/usuarios/${id}`, input);
  }

  // ---- Empresas -------------------------------------------------------------

  async listEmpresas(): Promise<Empresa[]> {
    const res = await api.get<{ data: Empresa[] }>('/empresas');
    return res.data;
  }

  async toggleUsuarioAtivo(id: number, ativo: boolean): Promise<UsuarioAdmin> {
    return api.patch<UsuarioAdmin>(`/usuarios/${id}/status`, { ativo });
  }

  async toggleUsuarioBloqueado(id: number, bloqueado: boolean): Promise<UsuarioAdmin> {
    return api.patch<UsuarioAdmin>(`/usuarios/${id}/bloqueio`, { bloqueado });
  }

  async resetarSenhaUsuario(id: number): Promise<{ senhaTemporaria: string }> {
    return api.post<{ senhaTemporaria: string }>(`/usuarios/${id}/resetar-senha`, {});
  }

  async deleteUsuario(id: number): Promise<void> {
    await api.delete(`/usuarios/${id}`);
  }

  // ---- Perfis de acesso -----------------------------------------------------

  async listPerfis(): Promise<Perfil[]> {
    const res = await api.get<{ data: Perfil[] }>('/perfis');
    return res.data;
  }

  async createPerfil(input: { nome: string; descricao?: string; permissoes: Perfil['permissoes'] }): Promise<Perfil> {
    return api.post<Perfil>('/perfis', input);
  }

  async updatePerfil(id: number, input: Partial<{ nome: string; descricao: string; permissoes: Perfil['permissoes'] }>): Promise<Perfil> {
    return api.put<Perfil>(`/perfis/${id}`, input);
  }

  async deletePerfil(id: number): Promise<void> {
    await api.delete(`/perfis/${id}`);
  }

  // ---- Geotecnologia: Rádios -------------------------------------------------

  async listRadios(): Promise<Radio[]> {
    const res = await api.get<Paginated<Radio>>(`/radios${qs({ limit: 200, sort: '-updatedAt' })}`);
    return res.data;
  }

  async createRadio(input: NovoRadioInput, idempotencyKey?: string): Promise<Radio> {
    return api.post<Radio>('/radios', radioBody(input), idemHeaders(idempotencyKey));
  }

  async updateRadio(id: number, input: EditarRadioInput, idempotencyKey?: string): Promise<Radio> {
    return api.put<Radio>(`/radios/${id}`, radioBody(input), idemHeaders(idempotencyKey));
  }

  async deleteRadio(id: number, idempotencyKey?: string): Promise<void> {
    await api.delete(`/radios/${id}`, idemHeaders(idempotencyKey));
  }

  async listManutencoesRadios(radioId?: number): Promise<ManutencaoRadio[]> {
    const res = await api.get<Paginated<ManutencaoRadio>>(
      `/manutencoes-radios${qs({ limit: 200, radioId, sort: '-data' })}`
    );
    return res.data;
  }

  async createManutencaoRadio(input: NovaManutencaoRadioInput, idempotencyKey?: string): Promise<ManutencaoRadio> {
    return api.post<ManutencaoRadio>(
      '/manutencoes-radios',
      {
        radioId: input.radioId,
        frotaId: input.frotaId,
        titulo: input.titulo.trim(),
        tipo: input.tipo,
        tecnico: input.tecnico?.trim() || null,
      },
      idemHeaders(idempotencyKey)
    );
  }

  async updateManutencaoRadioStatus(id: number, status: StatusManutencao, insumoIds?: number[], idempotencyKey?: string): Promise<ManutencaoRadio> {
    return api.patch<ManutencaoRadio>(`/manutencoes-radios/${id}/status`, { status, insumoIds }, idemHeaders(idempotencyKey));
  }

  // ---- Geotecnologia: Frotas --------------------------------------------------

  async listFrotas(somenteAtivos = true): Promise<Frota[]> {
    const res = await api.get<Paginated<Frota>>(`/frotas${qs({ limit: 200, ativo: somenteAtivos || undefined })}`);
    return res.data;
  }

  async createFrota(input: { numero: string; nome: string }): Promise<Frota> {
    return api.post<Frota>('/frotas', input);
  }

  async updateFrota(id: number, input: Partial<{ numero: string; nome: string; ativo: boolean }>): Promise<Frota> {
    return api.put<Frota>(`/frotas/${id}`, input);
  }

  async deleteFrota(id: number): Promise<void> {
    await api.delete(`/frotas/${id}`);
  }

  // ---- Geotecnologia: Insumos --------------------------------------------------

  async listInsumos(somenteAtivos = true): Promise<Insumo[]> {
    const res = await api.get<Paginated<Insumo>>(`/insumos${qs({ limit: 200, ativo: somenteAtivos || undefined })}`);
    return res.data;
  }

  async createInsumo(input: { nome: string }): Promise<Insumo> {
    return api.post<Insumo>('/insumos', input);
  }

  async updateInsumo(id: number, input: Partial<{ nome: string; ativo: boolean }>): Promise<Insumo> {
    return api.put<Insumo>(`/insumos/${id}`, input);
  }

  async deleteInsumo(id: number): Promise<void> {
    await api.delete(`/insumos/${id}`);
  }

  // ---- Geotecnologia: Áreas ----------------------------------------------------

  async listAreasGeo(somenteAtivos = true): Promise<AreaGeo[]> {
    const res = await api.get<Paginated<AreaGeo>>(`/areas-geo${qs({ limit: 200, ativo: somenteAtivos || undefined })}`);
    return res.data;
  }

  async createAreaGeo(input: { nome: string }): Promise<AreaGeo> {
    return api.post<AreaGeo>('/areas-geo', input);
  }

  async updateAreaGeo(id: number, input: Partial<{ nome: string; ativo: boolean }>): Promise<AreaGeo> {
    return api.put<AreaGeo>(`/areas-geo/${id}`, input);
  }

  async deleteAreaGeo(id: number): Promise<void> {
    await api.delete(`/areas-geo/${id}`);
  }

  // ---- Geotecnologia: Responsáveis ---------------------------------------------

  async listResponsaveisGeo(somenteAtivos = true): Promise<ResponsavelGeo[]> {
    const res = await api.get<Paginated<ResponsavelGeo>>(
      `/responsaveis-geo${qs({ limit: 200, ativo: somenteAtivos || undefined })}`
    );
    return res.data;
  }

  async createResponsavelGeo(input: { nome: string; matricula?: string | null; cpf?: string | null; areaId?: number | null }): Promise<ResponsavelGeo> {
    return api.post<ResponsavelGeo>('/responsaveis-geo', input);
  }

  async updateResponsavelGeo(id: number, input: Partial<{ nome: string; matricula: string | null; cpf: string | null; areaId: number | null; ativo: boolean }>): Promise<ResponsavelGeo> {
    return api.put<ResponsavelGeo>(`/responsaveis-geo/${id}`, input);
  }

  async deleteResponsavelGeo(id: number): Promise<void> {
    await api.delete(`/responsaveis-geo/${id}`);
  }
}

export const repository = new RemoteRepository();
