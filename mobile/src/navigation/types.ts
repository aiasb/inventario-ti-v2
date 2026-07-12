import { StatusEquipamento } from '../types/models';

export type TabParamList = {
  Inicio: undefined;
  Itens: { statusFilter?: StatusEquipamento | 'Todos' } | undefined;
  Relatorios: undefined;
  Config: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  Detalhe: { id: number };
  BuscaAvancada: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
