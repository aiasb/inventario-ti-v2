import { api, qs } from '../api/client';
import { Equipamento, Manutencao, Responsavel, Setor, TipoEquipamento } from '../types/models';
import { nextPatrimonio } from '../utils/format';

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
}

export interface NovaManutencaoInput {
  equipamentoId: number;
  titulo: string;
  tipo: Manutencao['tipo'];
  tecnico?: string;
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

  peekNextPatrimonio(equipamentos: Equipamento[]): string {
    return nextPatrimonio(equipamentos.map((e) => e.patrimonio));
  }

  async createEquipamento(input: NovoEquipamentoInput): Promise<Equipamento> {
    return api.post<Equipamento>('/equipamentos', {
      tipoId: input.tipoId,
      modelo: input.modelo.trim(),
      serial: input.serial.trim().toUpperCase(),
      hostname: input.hostname ? input.hostname.trim().toUpperCase() : null,
      imei: input.imei ? input.imei.trim() : null,
      responsavelId: input.responsavelId || null,
      setorId: input.setorId || null,
      status: input.status,
    });
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

  async listResponsaveis(): Promise<Responsavel[]> {
    const res = await api.get<Paginated<Responsavel>>(`/responsaveis${qs({ limit: 200, ativo: true })}`);
    return res.data;
  }

  async listSetores(): Promise<Setor[]> {
    const res = await api.get<Paginated<Setor>>(`/setores${qs({ limit: 200, ativo: true })}`);
    return res.data;
  }

  async listTiposEquipamento(): Promise<TipoEquipamento[]> {
    const res = await api.get<Paginated<TipoEquipamento>>(`/tipos-equipamento${qs({ limit: 200, ativo: true })}`);
    return res.data;
  }
}

export const repository = new RemoteRepository();
