import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const EmpresaContext = createContext(null);

function storageKey(usuarioId) {
  return `empresaAtual:${usuarioId}`;
}

export function EmpresaProvider({ children }) {
  const { usuario } = useAuth();
  const [empresaAtual, setEmpresaAtualState] = useState(null);

  const empresas = usuario?.empresas || [];

  useEffect(() => {
    if (!usuario) {
      setEmpresaAtualState(null);
      return;
    }
    if (empresas.length === 1) {
      setEmpresaAtualState(empresas[0].slug);
      return;
    }
    const saved = localStorage.getItem(storageKey(usuario.id));
    if (saved && empresas.some((e) => e.slug === saved)) {
      setEmpresaAtualState(saved);
    } else {
      setEmpresaAtualState(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, empresas.length]);

  const setEmpresaAtual = useCallback(
    (slug) => {
      setEmpresaAtualState(slug);
      if (usuario) localStorage.setItem(storageKey(usuario.id), slug);
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

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa deve ser usado dentro de EmpresaProvider');
  return ctx;
}
