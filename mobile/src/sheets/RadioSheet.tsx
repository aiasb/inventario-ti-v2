import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useSheet } from '../context/SheetContext';
import { useToast } from '../context/ToastContext';

const SEM_RESPONSAVEL = 'Nenhum (fica em estoque)';
const SEM_FROTA = 'Sem frota';
const SEM_AREA = 'Sem área';

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}-${month}-${year}`;
}

function toISODate(display: string): string {
  const [day, month, year] = display.split('-');
  return `${year}-${month}-${day}`;
}

function emptyState() {
  return {
    numeroSerie: '',
    modelo: '',
    idDigital: '',
    idAnalogico: '',
    frotaNome: SEM_FROTA,
    areaNome: SEM_AREA,
    responsavelNome: SEM_RESPONSAVEL,
    dataAquisicao: '',
    observacoes: '',
  };
}

const DATE_RE = /^\d{2}-\d{2}-\d{4}$/;

export function RadioSheet() {
  const { radioSheetVisible, editingRadio, closeRadioSheet } = useSheet();
  const { criarRadio, editarRadio, frotas, areasGeo, responsaveisGeo } = useAppData();
  const { showToast } = useToast();

  const visible = radioSheetVisible;
  const editing = editingRadio;
  const onClose = closeRadioSheet;

  const [form, setForm] = useState(emptyState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        numeroSerie: editing.numeroSerie,
        modelo: editing.modelo || '',
        idDigital: editing.idDigital || '',
        idAnalogico: editing.idAnalogico || '',
        frotaNome: editing.frota ? `${editing.frota.numero} · ${editing.frota.nome}` : SEM_FROTA,
        areaNome: editing.area?.nome || SEM_AREA,
        responsavelNome: editing.responsavel?.nome || SEM_RESPONSAVEL,
        dataAquisicao: toDateInput(editing.dataAquisicao),
        observacoes: editing.observacoes || '',
      });
    } else {
      setForm(emptyState());
    }
  }, [visible, editing]);

  const frotaOptions = [SEM_FROTA, ...frotas.map((f) => `${f.numero} · ${f.nome}`)];
  const areaOptions = [SEM_AREA, ...areasGeo.map((a) => a.nome)];
  const responsavelOptions = [SEM_RESPONSAVEL, ...responsaveisGeo.map((r) => r.nome)];

  function set<K extends keyof ReturnType<typeof emptyState>>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const missing: string[] = [];
    if (!form.numeroSerie.trim()) missing.push('Número de série');
    if (form.dataAquisicao && !DATE_RE.test(form.dataAquisicao)) missing.push('Data de aquisição (DD-MM-AAAA)');

    if (missing.length > 0) {
      showToast(`Preencha: ${missing.join(', ')}`);
      return;
    }

    const frota = frotas.find((f) => `${f.numero} · ${f.nome}` === form.frotaNome);
    const area = areasGeo.find((a) => a.nome === form.areaNome);
    const responsavel = responsaveisGeo.find((r) => r.nome === form.responsavelNome);

    setSaving(true);
    try {
      const input = {
        numeroSerie: form.numeroSerie,
        modelo: form.modelo || null,
        idDigital: form.idDigital || null,
        idAnalogico: form.idAnalogico || null,
        frotaId: frota?.id || null,
        areaId: area?.id || null,
        responsavelId: responsavel?.id || null,
        status: (responsavel ? 'Ativo' : 'Estoque') as 'Ativo' | 'Estoque',
        dataAquisicao: form.dataAquisicao ? toISODate(form.dataAquisicao) : null,
        observacoes: form.observacoes || null,
      };

      if (editing) {
        const updated = await editarRadio(editing.id, input);
        onClose();
        showToast(`${updated.numeroSerie} atualizado com sucesso.`);
      } else {
        const created = await criarRadio(input);
        onClose();
        showToast(`${created.numeroSerie} cadastrado com sucesso.`);
      }
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar o rádio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{editing ? 'Editar rádio' : 'Novo rádio'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField label="Número de série" required autoCapitalize="characters" value={form.numeroSerie} onChangeText={(v) => set('numeroSerie', v)} />
        <FormField label="Modelo" placeholder="Ex.: Motorola DEP450" value={form.modelo} onChangeText={(v) => set('modelo', v)} />

        <View style={styles.row2}>
          <View style={styles.col}>
            <FormField label="ID Digital" value={form.idDigital} onChangeText={(v) => set('idDigital', v)} />
          </View>
          <View style={styles.col}>
            <FormField label="ID Analógico" value={form.idAnalogico} onChangeText={(v) => set('idAnalogico', v)} />
          </View>
        </View>

        <SelectField label="Frota" value={form.frotaNome} options={frotaOptions} onChange={(v) => set('frotaNome', v)} />
        <SelectField label="Área" value={form.areaNome} options={areaOptions} onChange={(v) => set('areaNome', v)} />
        <SelectField
          label="Responsável (vazio = fica em estoque)"
          value={form.responsavelNome}
          options={responsavelOptions}
          onChange={(v) => set('responsavelNome', v)}
        />

        <FormField
          label="Data de aquisição"
          placeholder="DD-MM-AAAA"
          keyboardType="numbers-and-punctuation"
          value={form.dataAquisicao}
          onChangeText={(v) => set('dataAquisicao', v)}
        />

        <FormField
          label="Observações"
          placeholder="Opcional"
          multiline
          value={form.observacoes}
          onChangeText={(v) => set('observacoes', v)}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar rádio'}</Text>
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
  row2: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
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
