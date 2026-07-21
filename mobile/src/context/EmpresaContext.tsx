import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Empresa } from '../types/models';
import { useAuth } from './AuthContext';

function storageKey(usuarioId: number): string {
  return `@inventario/empresaAtual:${usuarioId}`;
}

interface EmpresaContextValue {
  empresaAtual: string | null;
  empresas: Empresa[];
  setEmpresaAtual: (slug: string) => void;
  precisaEscolher: boolean;
}

const EmpresaContext = createContext<EmpresaContextValue | null>(null);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [empresaAtual, setEmpresaAtualState] = useState<string | null>(null);

  const empresas = useMemo(() => usuario?.empresas || [], [usuario]);

  useEffect(() => {
    if (!usuario) {
      setEmpresaAtualState(null);
      return;
    }
    if (empresas.length === 1) {
      setEmpresaAtualState(empresas[0].slug);
      return;
    }
    (async () => {
      const saved = await AsyncStorage.getItem(storageKey(usuario.id));
      if (saved && empresas.some((e) => e.slug === saved)) {
        setEmpresaAtualState(saved);
      } else {
        setEmpresaAtualState(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, empresas.length]);

  const setEmpresaAtual = useCallback(
    (slug: string) => {
      setEmpresaAtualState(slug);
      if (usuario) void AsyncStorage.setItem(storageKey(usuario.id), slug);
    },
    [usuario]
  );

  const precisaEscolher = !!usuario && empresas.length > 1 && !empresaAtual;

  const value = useMemo(
    () => ({ empresaAtual, empresas, setEmpresaAtual, precisaEscolher }),
    [empresaAtual, empresas, setEmpresaAtual, precisaEscolher]
  );

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa(): EmpresaContextValue {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa deve ser usado dentro de EmpresaProvider');
  return ctx;
}
