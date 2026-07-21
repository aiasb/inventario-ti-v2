import React, { createContext, useCallback, useContext, useState } from 'react';
import { Equipamento, Radio } from '../types/models';

interface SheetContextValue {
  equipamentoSheetVisible: boolean;
  editingEquipamento: Equipamento | null;
  openNovoEquipamento: () => void;
  openEditarEquipamento: (equipamento: Equipamento) => void;
  closeEquipamentoSheet: () => void;
  radioSheetVisible: boolean;
  editingRadio: Radio | null;
  openNovoRadio: () => void;
  openEditarRadio: (radio: Radio) => void;
  closeRadioSheet: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [equipamentoSheetVisible, setEquipamentoSheetVisible] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);
  const [radioSheetVisible, setRadioSheetVisible] = useState(false);
  const [editingRadio, setEditingRadio] = useState<Radio | null>(null);

  const openNovoEquipamento = useCallback(() => {
    setEditingEquipamento(null);
    setEquipamentoSheetVisible(true);
  }, []);

  const openEditarEquipamento = useCallback((equipamento: Equipamento) => {
    setEditingEquipamento(equipamento);
    setEquipamentoSheetVisible(true);
  }, []);

  const closeEquipamentoSheet = useCallback(() => setEquipamentoSheetVisible(false), []);

  const openNovoRadio = useCallback(() => {
    setEditingRadio(null);
    setRadioSheetVisible(true);
  }, []);

  const openEditarRadio = useCallback((radio: Radio) => {
    setEditingRadio(radio);
    setRadioSheetVisible(true);
  }, []);

  const closeRadioSheet = useCallback(() => setRadioSheetVisible(false), []);

  return (
    <SheetContext.Provider
      value={{
        equipamentoSheetVisible,
        editingEquipamento,
        openNovoEquipamento,
        openEditarEquipamento,
        closeEquipamentoSheet,
        radioSheetVisible,
        editingRadio,
        openNovoRadio,
        openEditarRadio,
        closeRadioSheet,
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
