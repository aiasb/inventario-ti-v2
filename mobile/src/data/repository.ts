import { api, qs } from '../api/client';
import {
  Equipamento,
  Fornecedor,
  Manutencao,
  Perfil,
  Responsavel,
  Setor,
  TipoEquipamento,
  UsuarioAdmin,
} from '../types/models';

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
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

  async createEquipamento(input: NovoEquipamentoInput): Promise<Equipamento> {
    return api.post<Equipamento>('/equipamentos', equipamentoBody(input));
  }

  async updateEquipamento(id: number, input: EditarEquipamentoInput): Promise<Equipamento> {
    return api.put<Equipamento>(`/equipamentos/${id}`, equipamentoBody(input));
  }

  async listManutencoes(equipamentoId?: number): Promise<Manutencao[]> {
    const res = await api.get<Paginated<Manutencao>>(
      `/manutencoes${qs({ limit: 200, equipamentoId, sort: '-data' })}`
    );
    return res.data;
  }

  async createManutencao(input: NovaManutencaoInput): Promise<Manutencao> {
    return api.post<Manutencao>('/manutencoes', {
      equipamentoId: input.equipamentoId,
      titulo: input.titulo.trim(),
      tipo: input.tipo,
      tecnico: input.tecnico?.trim() || null,
    });
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

  async createUsuario(input: { nome: string; email: string; senha: string; cargo?: string; perfilId: number }): Promise<UsuarioAdmin> {
    return api.post<UsuarioAdmin>('/usuarios', input);
  }

  async updateUsuario(id: number, input: Partial<{ nome: string; email: string; senha: string; cargo: string; perfilId: number }>): Promise<UsuarioAdmin> {
    return api.put<UsuarioAdmin>(`/usuarios/${id}`, input);
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
}

export const repository = new RemoteRepository();
