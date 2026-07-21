import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { RadioPickerField } from '../components/RadioPickerField';
import { colors, withAlpha } from '../theme/colors';
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
  const { radios, frotas, abrirOsRadio } = useAppData();
  const { showToast } = useToast();
  const [modo, setModo] = useState<'radio' | 'frota'>('radio');
  const [selecionado, setSelecionado] = useState<Radio | null>(radio ?? null);
  const [frotaLabel, setFrotaLabel] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoManutencao>('Corretiva');
  const [tecnico, setTecnico] = useState('');
  const [saving, setSaving] = useState(false);

  const frotaOptions = frotas.filter((f) => f.ativo).map((f) => `${f.numero} · ${f.nome}`);

  useEffect(() => {
    if (visible) {
      setSelecionado(radio ?? null);
      setModo('radio');
      setFrotaLabel('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, radio]);

  function reset() {
    setTitulo('');
    setTipo('Corretiva');
    setTecnico('');
    setFrotaLabel('');
  }

  async function handleSave() {
    const frotaSelecionada = modo === 'frota' ? frotas.find((f) => `${f.numero} · ${f.nome}` === frotaLabel) : null;
    if (modo === 'radio' && !selecionado) {
      showToast('Selecione um rádio.');
      return;
    }
    if (modo === 'frota' && !frotaSelecionada) {
      showToast('Selecione uma frota.');
      return;
    }
    if (!titulo.trim()) {
      showToast('Informe o defeito.');
      return;
    }
    setSaving(true);
    try {
      const os = await abrirOsRadio({
        radioId: modo === 'radio' ? selecionado!.id : undefined,
        frotaId: modo === 'frota' ? frotaSelecionada!.id : undefined,
        titulo: titulo.trim(),
        tipo,
        tecnico,
      });
      reset();
      onClose();
      showToast(`${os.os} aberta.`);
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
        <>
          <View style={styles.modoRow}>
            <Pressable style={[styles.modoBtn, modo === 'radio' && styles.modoBtnActive]} onPress={() => setModo('radio')}>
              <Text style={[styles.modoText, modo === 'radio' && styles.modoTextActive]}>Rádio</Text>
            </Pressable>
            <Pressable style={[styles.modoBtn, modo === 'frota' && styles.modoBtnActive]} onPress={() => setModo('frota')}>
              <Text style={[styles.modoText, modo === 'frota' && styles.modoTextActive]}>Frota</Text>
            </Pressable>
          </View>

          {modo === 'radio' && (
            <RadioPickerField
              label="Rádio"
              required
              value={selecionado}
              radios={radios}
              onChange={setSelecionado}
            />
          )}

          {modo === 'frota' && (
            <SelectField label="Frota" required value={frotaLabel} options={frotaOptions} onChange={setFrotaLabel} />
          )}
        </>
      )}

      <FormField label="Informar defeito" required placeholder="Ex.: Rádio sem sinal" value={titulo} onChangeText={setTitulo} multiline numberOfLines={3} />
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
  modoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modoBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modoBtnActive: {
    backgroundColor: withAlpha(colors.accent, 0.14),
    borderColor: colors.accent,
  },
  modoText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  modoTextActive: {
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
