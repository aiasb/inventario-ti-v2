import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { Equipamento, TipoManutencao } from '../types/models';

const TIPOS: TipoManutencao[] = ['Corretiva', 'Preventiva'];

export function NovaOsSheet({
  visible,
  onClose,
  equipamento,
}: {
  visible: boolean;
  onClose: () => void;
  equipamento: Equipamento;
}) {
  const { abrirOs } = useAppData();
  const { showToast } = useToast();
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoManutencao>('Corretiva');
  const [tecnico, setTecnico] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitulo('');
    setTipo('Corretiva');
    setTecnico('');
  }

  async function handleSave() {
    if (!titulo.trim()) {
      showToast('Informe um título para a OS.');
      return;
    }
    setSaving(true);
    try {
      const os = await abrirOs({ equipamentoId: equipamento.id, titulo, tipo, tecnico });
      reset();
      onClose();
      showToast(`${os.os} aberta para ${equipamento.serial}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={0.62}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Abrir OS</Text>
        <View style={styles.patBadge}>
          <Text style={styles.patText}>{equipamento.serial}</Text>
        </View>
      </View>

      <FormField label="Título" required placeholder="Ex.: Tela com defeito" value={titulo} onChangeText={setTitulo} />
      <SelectField label="Tipo" value={tipo} options={TIPOS} onChange={(v) => setTipo(v as TipoManutencao)} />
      <FormField label="Técnico responsável" placeholder="Nome do técnico" value={tecnico} onChangeText={setTecnico} />

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Salvando…' : 'Abrir OS'}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 19,
    color: colors.text,
  },
  patBadge: {
    borderWidth: 1,
    borderColor: 'rgba(87,178,94,0.35)',
    backgroundColor: 'rgba(87,178,94,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  patText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    height: touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#06210b',
  },
});
