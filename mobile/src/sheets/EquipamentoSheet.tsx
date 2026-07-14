import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheet } from '../components/BottomSheet';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useSheet } from '../context/SheetContext';
import { useToast } from '../context/ToastContext';
import { RootStackParamList } from '../navigation/types';

const SEM_RESPONSAVEL = 'Nenhum (fica em estoque)';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

function emptyState() {
  return {
    tipoNome: '',
    modelo: '',
    serial: '',
    hostname: '',
    imei: '',
    responsavelNome: SEM_RESPONSAVEL,
    setorNome: '',
    dataAquisicao: '',
    dataGarantia: '',
    observacoes: '',
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function EquipamentoSheet() {
  const { equipamentoSheetVisible, editingEquipamento, closeEquipamentoSheet } = useSheet();
  const { criarEquipamento, editarEquipamento, tiposEquipamento, setores, responsaveis } = useAppData();
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();

  const editing = editingEquipamento;
  const [form, setForm] = useState(emptyState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!equipamentoSheetVisible) return;
    if (editing) {
      setForm({
        tipoNome: editing.tipo.nome,
        modelo: editing.modelo,
        serial: editing.serial,
        hostname: editing.hostname || '',
        imei: editing.imei || '',
        responsavelNome: editing.responsavel?.nome || SEM_RESPONSAVEL,
        setorNome: editing.setor?.nome || setores[0]?.nome || '',
        dataAquisicao: toDateInput(editing.dataAquisicao),
        dataGarantia: toDateInput(editing.dataGarantia),
        observacoes: editing.observacoes || '',
      });
    } else {
      setForm({
        ...emptyState(),
        tipoNome: tiposEquipamento[0]?.nome || '',
        setorNome: setores[0]?.nome || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipamentoSheetVisible, editing]);

  const tipoOptions = tiposEquipamento.map((t) => t.nome);
  const setorOptions = setores.map((s) => s.nome);
  const responsavelOptions = [SEM_RESPONSAVEL, ...responsaveis.map((r) => r.nome)];

  const selectedTipo = tiposEquipamento.find((t) => t.nome === form.tipoNome) || editing?.tipo;
  const needsHostname = selectedTipo?.nome === 'Notebook' || selectedTipo?.nome === 'Desktop';
  const showsHostname = needsHostname || !!selectedTipo?.prefixoHostname;
  const needsImei = selectedTipo?.nome === 'Celular';

  function set<K extends keyof ReturnType<typeof emptyState>>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const missing: string[] = [];
    if (!selectedTipo) missing.push('Tipo');
    if (!form.modelo.trim()) missing.push('Modelo');
    if (!form.serial.trim()) missing.push('Serial');
    if (needsHostname && !form.hostname.trim()) missing.push('Hostname');
    if (needsImei) {
      const digits = form.imei.replace(/\D/g, '');
      if (digits.length < 14 || digits.length > 16) missing.push('IMEI (14–16 dígitos)');
    }
    if (form.dataAquisicao && !DATE_RE.test(form.dataAquisicao)) missing.push('Data de aquisição (AAAA-MM-DD)');
    if (form.dataGarantia && !DATE_RE.test(form.dataGarantia)) missing.push('Garantia até (AAAA-MM-DD)');

    if (missing.length > 0) {
      showToast(`Preencha: ${missing.join(', ')}`);
      return;
    }

    const responsavel = responsaveis.find((r) => r.nome === form.responsavelNome);
    const setor = setores.find((s) => s.nome === form.setorNome);
    const tipoId = selectedTipo!.id;

    setSaving(true);
    try {
      const input = {
        tipoId,
        modelo: form.modelo,
        serial: form.serial,
        hostname: showsHostname ? form.hostname || null : null,
        imei: needsImei ? form.imei.replace(/\D/g, '') : null,
        responsavelId: responsavel?.id || null,
        setorId: setor?.id || null,
        status: (responsavel ? 'Ativo' : 'Estoque') as 'Ativo' | 'Estoque',
        dataAquisicao: form.dataAquisicao || null,
        dataGarantia: form.dataGarantia || null,
        observacoes: form.observacoes || null,
      };

      if (editing) {
        const updated = await editarEquipamento(editing.id, input);
        closeEquipamentoSheet();
        showToast(`${updated.serial} atualizado com sucesso.`);
      } else {
        const created = await criarEquipamento(input);
        closeEquipamentoSheet();
        navigation.navigate('Tabs', { screen: 'Itens', params: { statusFilter: 'Todos' } } as never);
        showToast(`${created.serial} cadastrado com sucesso.`);
      }
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar o equipamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={equipamentoSheetVisible} onClose={closeEquipamentoSheet}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{editing ? 'Editar equipamento' : 'Novo equipamento'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Tipo"
          value={form.tipoNome}
          options={tipoOptions}
          onChange={(v) => set('tipoNome', v)}
        />
        <FormField label="Modelo" required placeholder="Ex.: Dell Latitude 5450" value={form.modelo} onChangeText={(v) => set('modelo', v)} />

        <View style={styles.row2}>
          <View style={styles.col}>
            <FormField label="Serial" required placeholder="SN-…" autoCapitalize="characters" value={form.serial} onChangeText={(v) => set('serial', v)} />
          </View>
          {showsHostname && (
            <View style={styles.col}>
              <FormField
                label="Hostname"
                required={needsHostname}
                placeholder="UCACU-NB-…"
                autoCapitalize="characters"
                value={form.hostname}
                onChangeText={(v) => set('hostname', v)}
              />
            </View>
          )}
        </View>

        {needsImei && (
          <FormField
            label="IMEI"
            required
            placeholder="15 dígitos"
            keyboardType="number-pad"
            value={form.imei}
            onChangeText={(v) => set('imei', v)}
          />
        )}

        <SelectField
          label="Responsável (vazio = fica em estoque)"
          value={form.responsavelNome}
          options={responsavelOptions}
          onChange={(v) => set('responsavelNome', v)}
        />

        <SelectField label="Setor" value={form.setorNome} options={setorOptions} onChange={(v) => set('setorNome', v)} />

        <View style={styles.row2}>
          <View style={styles.col}>
            <FormField
              label="Data de aquisição"
              placeholder="AAAA-MM-DD"
              keyboardType="numbers-and-punctuation"
              value={form.dataAquisicao}
              onChangeText={(v) => set('dataAquisicao', v)}
            />
          </View>
          <View style={styles.col}>
            <FormField
              label="Garantia até"
              placeholder="AAAA-MM-DD"
              keyboardType="numbers-and-punctuation"
              value={form.dataGarantia}
              onChangeText={(v) => set('dataGarantia', v)}
            />
          </View>
        </View>

        <FormField
          label="Observações"
          placeholder="Opcional"
          multiline
          value={form.observacoes}
          onChangeText={(v) => set('observacoes', v)}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={closeEquipamentoSheet}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar equipamento'}</Text>
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
