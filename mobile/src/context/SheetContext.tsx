import React, { createContext, useCallback, useContext, useState } from 'react';
import { Equipamento } from '../types/models';

interface SheetContextValue {
  equipamentoSheetVisible: boolean;
  editingEquipamento: Equipamento | null;
  openNovoEquipamento: () => void;
  openEditarEquipamento: (equipamento: Equipamento) => void;
  closeEquipamentoSheet: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [equipamentoSheetVisible, setEquipamentoSheetVisible] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);

  const openNovoEquipamento = useCallback(() => {
    setEditingEquipamento(null);
    setEquipamentoSheetVisible(true);
  }, []);

  const openEditarEquipamento = useCallback((equipamento: Equipamento) => {
    setEditingEquipamento(equipamento);
    setEquipamentoSheetVisible(true);
  }, []);

  const closeEquipamentoSheet = useCallback(() => setEquipamentoSheetVisible(false), []);

  return (
    <SheetContext.Provider
      value={{
        equipamentoSheetVisible,
        editingEquipamento,
        openNovoEquipamento,
        openEditarEquipamento,
        closeEquipamentoSheet,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet deve ser usado dentro de SheetProvider');
  return ctx;
}
