import React, { createContext, useCallback, useContext, useState } from 'react';

interface SheetContextValue {
  novoEquipamentoVisible: boolean;
  openNovoEquipamento: () => void;
  closeNovoEquipamento: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [novoEquipamentoVisible, setNovoEquipamentoVisible] = useState(false);

  const openNovoEquipamento = useCallback(() => setNovoEquipamentoVisible(true), []);
  const closeNovoEquipamento = useCallback(() => setNovoEquipamentoVisible(false), []);

  return (
    <SheetContext.Provider value={{ novoEquipamentoVisible, openNovoEquipamento, closeNovoEquipamento }}>
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet deve ser usado dentro de SheetProvider');
  return ctx;
}
