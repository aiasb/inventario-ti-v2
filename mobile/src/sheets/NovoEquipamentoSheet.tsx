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

function emptyState() {
  return {
    tipoNome: '',
    modelo: '',
    serial: '',
    hostname: '',
    imei: '',
    responsavelNome: SEM_RESPONSAVEL,
    setorNome: '',
  };
}

export function NovoEquipamentoSheet() {
  const { novoEquipamentoVisible, closeNovoEquipamento } = useSheet();
  const { proximoPatrimonio, criarEquipamento, tiposEquipamento, setores, responsaveis } = useAppData();
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();

  const [form, setForm] = useState(emptyState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (novoEquipamentoVisible) {
      setForm({
        ...emptyState(),
        tipoNome: tiposEquipamento[0]?.nome || '',
        setorNome: setores[0]?.nome || '',
      });
    }
  }, [novoEquipamentoVisible, tiposEquipamento, setores]);

  const tipoOptions = tiposEquipamento.map((t) => t.nome);
  const setorOptions = setores.map((s) => s.nome);
  const responsavelOptions = [SEM_RESPONSAVEL, ...responsaveis.map((r) => r.nome)];

  const selectedTipo = tiposEquipamento.find((t) => t.nome === form.tipoNome);
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

    if (missing.length > 0) {
      showToast(`Preencha: ${missing.join(', ')}`);
      return;
    }

    const responsavel = responsaveis.find((r) => r.nome === form.responsavelNome);
    const setor = setores.find((s) => s.nome === form.setorNome);

    setSaving(true);
    try {
      const created = await criarEquipamento({
        tipoId: selectedTipo!.id,
        modelo: form.modelo,
        serial: form.serial,
        hostname: showsHostname ? form.hostname || null : null,
        imei: needsImei ? form.imei.replace(/\D/g, '') : null,
        responsavelId: responsavel?.id || null,
        setorId: setor?.id || null,
        status: responsavel ? 'Ativo' : 'Estoque',
      });
      closeNovoEquipamento();
      navigation.navigate('Tabs', { screen: 'Itens', params: { statusFilter: 'Todos' } } as never);
      showToast(`${created.patrimonio} cadastrado com sucesso.`);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar o equipamento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={novoEquipamentoVisible} onClose={closeNovoEquipamento}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Novo equipamento</Text>
        <View style={styles.patBadge}>
          <Text style={styles.patText}>{proximoPatrimonio}</Text>
        </View>
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
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={closeNovoEquipamento}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Salvando…' : 'Salvar equipamento'}</Text>
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
