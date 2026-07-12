export type StatusEquipamento = 'Ativo' | 'Manutencao' | 'Estoque' | 'Baixado';

// "Atividade recente" é derivada no app (a partir de equipamentos e OSs
// recentes) — a API não tem um endpoint de log de atividades dedicado.
export interface Atividade {
  id: string;
  texto: string;
  autor: string;
  data: string; // ISO datetime
  cor: 'accent' | 'warning' | 'muted';
}

export interface TipoEquipamento {
  id: number;
  nome: string;
  prefixoHostname: string | null;
}

export interface Setor {
  id: number;
  nome: string;
}

export interface Fornecedor {
  id: number;
  nome: string;
}

export interface Responsavel {
  id: number;
  nome: string;
  matricula: string | null;
  cpf: string | null;
  setorId: number | null;
}

export interface Equipamento {
  id: number;
  patrimonio: string;
  tipo: TipoEquipamento;
  modelo: string;
  serial: string;
  hostname: string | null;
  imei: string | null;
  setor: Setor | null;
  fornecedor: Fornecedor | null;
  responsavel: { id: number; nome: string } | null;
  status: StatusEquipamento;
  dataAquisicao: string | null; // ISO date
  dataGarantia: string | null; // ISO date
  fotoUrl: string | null;
  observacoes: string | null;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export type TipoManutencao = 'Corretiva' | 'Preventiva';
// Os valores vêm exatamente como o backend grava (sem acento em "Concluida").
export type StatusManutencao = 'Aberta' | 'Em andamento' | 'Concluida';

export interface Manutencao {
  id: number;
  os: string;
  equipamento: { id: number; patrimonio: string; serial: string; modelo: string };
  titulo: string;
  tipo: TipoManutencao;
  tecnico: string | null;
  custo: number | null;
  descricao: string | null;
  data: string; // ISO date
  status: StatusManutencao;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_EQUIPAMENTO: StatusEquipamento[] = ['Ativo', 'Manutencao', 'Estoque', 'Baixado'];

export const STATUS_MANUTENCAO: StatusManutencao[] = ['Aberta', 'Em andamento', 'Concluida'];

export const TIPO_SIGLA_FALLBACK: Record<string, string> = {
  Notebook: 'NB',
  Desktop: 'DT',
  Celular: 'CEL',
  Monitor: 'MON',
  Impressora: 'IMP',
  Servidor: 'SRV',
  Nobreak: 'UPS',
  Periférico: 'PER',
};

export function tipoSigla(tipo: TipoEquipamento): string {
  return TIPO_SIGLA_FALLBACK[tipo.nome] || tipo.prefixoHostname || tipo.nome.slice(0, 3).toUpperCase();
}

export function statusLabel(status: StatusEquipamento): string {
  return status === 'Manutencao' ? 'Manutenção' : status;
}

export function statusManutencaoLabel(status: StatusManutencao): string {
  return status === 'Concluida' ? 'Concluída' : status;
}
