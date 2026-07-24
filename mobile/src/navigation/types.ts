import { StatusEquipamento } from '../types/models';

export type TabParamListTI = {
  Inicio: undefined;
  Itens: { statusFilter?: StatusEquipamento | 'Todos' } | undefined;
  Manutencoes: undefined;
  Termos: undefined;
  Relatorios: undefined;
  Config: undefined;
};

export type TabParamListGeo = {
  InicioGeo: undefined;
  RadiosTab: undefined;
  ManutencoesRadiosTab: undefined;
  RelatoriosGeoTab: undefined;
  OcorrenciasTab: undefined;
  ConfigGeo: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SelecionarEmpresa: undefined;
  Tabs: undefined;
  Detalhe: { id: number };
  BuscaAvancada: undefined;
  Cadastros: { tab?: 'tipos-equipamento' | 'setores' | 'fornecedores' | 'status-ativo' } | undefined;
  Responsaveis: undefined;
  Acessos: undefined;
  Sincronizacao: undefined;
  Radios: undefined;
  DetalheRadio: { id: number };
  ManutencoesRadios: undefined;
  Colaboradores: undefined;
  CadastrosGeo: { tab?: 'frotas' | 'areas-geo' | 'responsaveis' | 'modelos' | 'status-ativo' | 'insumos' | 'transportadoras' | 'fornecedores-geo' } | undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
