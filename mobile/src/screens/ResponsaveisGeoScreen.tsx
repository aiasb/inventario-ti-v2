import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { BottomSheet } from '../components/BottomSheet';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { repository } from '../data/repository';
import { AreaGeo, ResponsavelGeo } from '../types/models';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SEM_AREA = 'Sem área';

function emptyForm() {
  return { nome: '', matricula: '', cpf: '', areaNome: SEM_AREA };
}

export function ResponsaveisGeoScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<ResponsavelGeo[]>([]);
  const [areas, setAreas] = useState<AreaGeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resp, areaList] = await Promise.all([repository.listResponsaveisGeo(false), repository.listAreasGeo(false)]);
      setItems(resp);
      setAreas(areaList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function areaNomeDe(areaId: number | null): string {
    return areas.find((a) => a.id === areaId)?.nome || '—';
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(item: ResponsavelGeo) {
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      matricula: item.matricula || '',
      cpf: item.cpf || '',
      areaNome: areaNomeDe(item.areaId) === '—' ? SEM_AREA : areaNomeDe(item.areaId),
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      showToast('Preencha o nome.');
      return;
    }
    const area = areas.find((a) => a.nome === form.areaNome);
    setSaving(true);
    try {
      const body = {
        nome: form.nome.trim(),
        matricula: form.matricula.trim() || null,
        cpf: form.cpf.trim() || null,
        areaId: area?.id || null,
      };
      if (editingId) {
        await repository.updateResponsavelGeo(editingId, body);
        showToast('Responsável atualizado.');
      } else {
        await repository.createResponsavelGeo(body);
        showToast('Responsável criado.');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(item: ResponsavelGeo) {
    try {
      await repository.updateResponsavelGeo(item.id, { ativo: !item.ativo });
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível atualizar.');
    }
  }

  async function remove(item: ResponsavelGeo) {
    try {
      await repository.deleteResponsavelGeo(item.id);
      showToast('Responsável removido.');
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível remover.');
    }
  }

  const areaOptions = [SEM_AREA, ...areas.map((a) => a.nome)];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Responsáveis (Geo)</Text>
        {podeCriar('responsaveisGeo') && (
          <Pressable style={styles.addBtn} onPress={openNew}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      {loading && <View style={styles.center}><Text style={styles.emptyText}>Carregando…</Text></View>}

      {!loading && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Nenhum responsável cadastrado.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.nome}</Text>
                <Text style={styles.rowSubtitle}>
                  {item.matricula || 'sem matrícula'} · {areaNomeDe(item.areaId)}
                </Text>
              </View>
              {podeEditar('responsaveisGeo') && (
                <Switch
                  value={item.ativo}
                  onValueChange={() => toggleAtivo(item)}
                  trackColor={{ false: colors.border, true: colors.accentGradientFrom }}
                  thumbColor="#fff"
                />
              )}
              {podeEditar('responsaveisGeo') && (
                <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <Feather name="edit-2" size={15} color={colors.textSecondary} />
                </Pressable>
              )}
              {podeExcluir('responsaveisGeo') && (
                <Pressable style={styles.iconBtn} onPress={() => remove(item)}>
                  <Feather name="trash-2" size={15} color={colors.danger} />
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} heightPercent={0.6}>
        <Text style={styles.sheetTitle}>{editingId ? 'Editar responsável' : 'Novo responsável'}</Text>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FormField label="Nome" required value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} />
          <FormField label="Matrícula" value={form.matricula} onChangeText={(v) => setForm((f) => ({ ...f, matricula: v }))} />
          <FormField label="CPF" value={form.cpf} onChangeText={(v) => setForm((f) => ({ ...f, cpf: v }))} />
          <SelectField label="Área" value={form.areaNome} options={areaOptions} onChange={(v) => setForm((f) => ({ ...f, areaNome: v }))} />
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Salvando…' : 'Salvar'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceFrom,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: fonts.titleSemiBold, fontSize: 18, color: colors.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  center: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  rowSubtitle: { fontFamily: fonts.bodyRegular, fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: fonts.titleSemiBold, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm },
  cancelBtn: {
    flex: 1, height: touchTarget, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  saveBtn: {
    flex: 2, height: touchTarget, borderRadius: radius.sm, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#06210b' },
});
