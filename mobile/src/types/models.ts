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
  ativo: boolean;
}

export interface Setor {
  id: number;
  nome: string;
  ativo: boolean;
}

/** Cadastro compartilhado entre TI e Geotecnologia (ver plano de
 * multi-empresa) — usado para popular o seletor de status de
 * equipamentos/rádios em vez de um enum fixo. */
export interface StatusAtivo {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
}

export interface Responsavel {
  id: number;
  nome: string;
  matricula: string | null;
  cpf: string | null;
  setorId: number | null;
  ativo: boolean;
}

export interface Empresa {
  id: number;
  nome: string;
  slug: string;
}

export interface ModulePermission {
  podeVer: boolean;
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
}

export interface UsuarioAdmin {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
  perfil: string;
  perfilId: number;
  ativo: boolean;
  bloqueado: boolean;
  ultimoAcesso: string | null;
  empresas: Empresa[];
}

export interface Perfil {
  id: number;
  nome: string;
  descricao: string | null;
  permissoes: Record<string, ModulePermission>;
}

export const MODULOS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inventario', label: 'Inventário' },
  { key: 'manutencoes', label: 'Manutenções' },
  { key: 'termos', label: 'Termos' },
  { key: 'responsaveis', label: 'Responsáveis' },
  { key: 'acessos', label: 'Acessos' },
  { key: 'cadastros', label: 'Cadastros' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'radios', label: 'Rádios (Geotecnologia)' },
  { key: 'manutencoesRadios', label: 'Manutenções de Rádios' },
  { key: 'responsaveisGeo', label: 'Responsáveis (Geotecnologia)' },
  { key: 'cadastrosGeo', label: 'Cadastros (Geotecnologia)' },
  { key: 'ocorrencias', label: 'Ocorrências (Geotecnologia)' },
  { key: 'colaboradores', label: 'Colaboradores (Geotecnologia)' },
];

export interface Equipamento {
  id: number;
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
  /** Só existe localmente: true enquanto o registro foi criado/editado offline
   * e ainda não foi confirmado pelo servidor (ver mobile/src/offline). */
  pendingSync?: boolean;
}

export type TipoManutencao = 'Corretiva' | 'Preventiva';
// Os valores vêm exatamente como o backend grava (sem acento em "Concluida").
export type StatusManutencao = 'Aberta' | 'Em andamento' | 'Concluida';

export interface Manutencao {
  id: number;
  os: string;
  equipamento: { id: number; serial: string; modelo: string };
  titulo: string;
  tipo: TipoManutencao;
  tecnico: string | null;
  custo: number | null;
  descricao: string | null;
  data: string; // ISO date
  status: StatusManutencao;
  createdAt: string;
  updatedAt: string;
  /** Só existe localmente — ver Equipamento.pendingSync. */
  pendingSync?: boolean;
}

export interface TermoModelo {
  id: number;
  nome: string;
  texto: string | null;
  arquivoNome: string | null;
  temArquivo: boolean;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Termo {
  id: number;
  numero: string;
  colaborador: string;
  cargo: string | null;
  data: string; // ISO date
  observacoes: string | null;
  assinado: boolean;
  dataAssinatura: string | null;
  devolvido: boolean;
  dataDevolucao: string | null;
  modelo: { id: number; nome: string; texto: string | null; temArquivo: boolean } | null;
  responsavel: { id: number; nome: string; cpf: string | null; matricula: string | null; setor: string | null } | null;
  equipamentos: { id: number; serial: string; modelo: string; hostname: string | null; imei: string | null; tipo: string | null }[];
  createdAt: string;
  updatedAt: string;
  /** Só existe localmente — ver Equipamento.pendingSync. */
  pendingSync?: boolean;
}

// ---- Geotecnologia (rádios) ------------------------------------------------
// Cadastros próprios, independentes de Setor/Responsavel de TI (ver plano
// de multi-empresa) — "Área" e "Responsável" aqui são entidades separadas.

export interface Frota {
  id: number;
  numero: string;
  nome: string;
  ativo: boolean;
}

export interface AreaGeo {
  id: number;
  nome: string;
  sigla: string | null;
  ativo: boolean;
}

export interface ResponsavelGeo {
  id: number;
  nome: string;
  matricula: string | null;
  cpf: string | null;
  funcao: string | null;
  departamento: string | null;
  setor: string | null;
  legenda: string | null;
  areaId: number | null;
  ativo: boolean;
}

export type TipoRadio = 'Movel' | 'Portatil';

export interface ModeloRadio {
  id: number;
  codigoChb: string | null;
  nome: string;
  serial: string | null;
  tipo: TipoRadio | null;
  valor: string | null;
  ativo: boolean;
}

export interface Radio {
  id: number;
  numeroSerie: string;
  modelo: string | null;
  idDigital: string | null;
  idAnalogico: string | null;
  tipo: TipoRadio | null;
  colaboradorResponsavel: string | null;
  codigo: string | null;
  frota: Frota | null;
  area: AreaGeo | null;
  responsavel: { id: number; nome: string } | null;
  status: StatusEquipamento;
  dataAquisicao: string | null; // ISO date
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Só existe localmente — ver Equipamento.pendingSync. */
  pendingSync?: boolean;
}

/** ID exibido na listagem de rádios = sigla da área + código informado no cadastro. */
export function radioIdExibicao(radio: Pick<Radio, 'area' | 'codigo'>): string {
  const texto = `${radio.area?.sigla || ''}${radio.codigo || ''}`;
  return texto || '—';
}

export function radioTipoLabel(tipo: TipoRadio | null): string {
  if (tipo === 'Movel') return 'Móvel';
  if (tipo === 'Portatil') return 'Portátil';
  return '—';
}

/** Status "Ativo" de rádios é exibido como "Em Campo" — o valor gravado no
 * banco continua "Ativo" (mesma automação de Ocorrências), só o rótulo muda,
 * e só nas telas de rádio (StatusBadge/statusLabel seguem usados por TI). */
export function radioStatusLabel(status: StatusEquipamento): string {
  if (status === 'Ativo') return 'Em Campo';
  return statusLabel(status);
}

export interface Insumo {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface Colaborador {
  id: number;
  matricula: string | null;
  nome: string;
  funcao: string | null;
  departamento: string | null;
  ativo: boolean;
}

export interface Transportadora {
  id: number;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
}

export interface FornecedorGeo {
  id: number;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
}

export const STATUS_OCORRENCIA = ['Em Aberto', 'Enviado', 'Em Analise', 'Finalizado', 'Recusado'] as const;
export type StatusOcorrencia = (typeof STATUS_OCORRENCIA)[number];

export function statusOcorrenciaLabel(status: StatusOcorrencia): string {
  if (status === 'Em Analise') return 'Em Análise';
  if (status === 'Recusado') return 'Recusado/Condenado';
  return status;
}

export function ocorrenciaLocked(status: StatusOcorrencia): boolean {
  return status === 'Finalizado' || status === 'Recusado';
}

export interface OcorrenciaItem {
  id: number;
  radioId: number;
  numeroSerie: string;
  modelo: string | null;
  radioStatus: StatusEquipamento;
  numeroOs: string | null;
  solicitante: string | null;
}

export interface Ocorrencia {
  id: number;
  numero: string;
  transportadora: { id: number; nome: string } | null;
  fornecedor: { id: number; nome: string } | null;
  notaFiscal: string | null;
  status: StatusOcorrencia;
  data: string;
  observacoes: string | null;
  itens: OcorrenciaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ManutencaoRadio {
  id: number;
  os: string;
  radio: { id: number; numeroSerie: string; modelo: string | null } | null;
  frota: { id: number; numero: string; nome: string } | null;
  titulo: string;
  insumos: { id: number; nome: string }[];
  tipo: TipoManutencao;
  tecnico: string | null;
  custo: number | null;
  descricao: string | null;
  data: string; // ISO date
  status: StatusManutencao;
  createdAt: string;
  updatedAt: string;
  /** Só existe localmente — ver Equipamento.pendingSync. */
  pendingSync?: boolean;
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
