import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { RadioPickerField } from '../components/RadioPickerField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { Radio, TipoManutencao } from '../types/models';

const TIPOS: TipoManutencao[] = ['Corretiva', 'Preventiva'];

export function NovaOsRadioSheet({
  visible,
  onClose,
  radio,
}: {
  visible: boolean;
  onClose: () => void;
  /** Quando omitido, o usuário escolhe o rádio na própria sheet. */
  radio?: Radio | null;
}) {
  const { radios, insumos, abrirOsRadio } = useAppData();
  const { showToast } = useToast();
  const [selecionado, setSelecionado] = useState<Radio | null>(radio ?? null);
  const [insumoNome, setInsumoNome] = useState('');
  const [tipo, setTipo] = useState<TipoManutencao>('Corretiva');
  const [tecnico, setTecnico] = useState('');
  const [saving, setSaving] = useState(false);

  const insumoOptions = insumos.filter((i) => i.ativo).map((i) => i.nome);

  useEffect(() => {
    if (visible) {
      setSelecionado(radio ?? null);
      setInsumoNome(insumoOptions[0] || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, radio]);

  function reset() {
    setInsumoNome('');
    setTipo('Corretiva');
    setTecnico('');
  }

  async function handleSave() {
    if (!selecionado) {
      showToast('Selecione um rádio.');
      return;
    }
    const insumo = insumos.find((i) => i.nome === insumoNome);
    if (!insumo) {
      showToast('Selecione um insumo.');
      return;
    }
    setSaving(true);
    try {
      const os = await abrirOsRadio({ radioId: selecionado.id, insumoId: insumo.id, tipo, tecnico });
      reset();
      onClose();
      showToast(`${os.os} aberta para ${selecionado.numeroSerie}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={0.68}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Abrir OS</Text>
        {radio && (
          <View style={styles.patBadge}>
            <Text style={styles.patText}>{radio.numeroSerie}</Text>
          </View>
        )}
      </View>

      {!radio && (
        <RadioPickerField
          label="Rádio"
          required
          value={selecionado}
          radios={radios}
          onChange={setSelecionado}
        />
      )}

      <SelectField label="Insumo" value={insumoNome} options={insumoOptions} onChange={setInsumoNome} />
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
