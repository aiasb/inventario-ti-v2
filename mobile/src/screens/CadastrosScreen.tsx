import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { FormField } from '../components/FormField';
import { BottomSheet } from '../components/BottomSheet';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { repository } from '../data/repository';
import { Fornecedor, Setor, TipoEquipamento } from '../types/models';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
}

interface TabConfig {
  key: 'tipos-equipamento' | 'setores' | 'fornecedores' | 'status-ativo';
  label: string;
  fields: FieldConfig[];
  subtitle: (item: any) => string;
}

const TABS: TabConfig[] = [
  {
    key: 'tipos-equipamento',
    label: 'Tipos de equipamento',
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'prefixoHostname', label: 'Prefixo do hostname (ex: NB)' },
    ],
    subtitle: (t: TipoEquipamento) => t.prefixoHostname || 'sem prefixo de hostname',
  },
  {
    key: 'setores',
    label: 'Setores',
    fields: [{ key: 'nome', label: 'Nome', required: true }],
    subtitle: () => '',
  },
  {
    key: 'fornecedores',
    label: 'Fornecedores',
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
    ],
    subtitle: (f: Fornecedor) => f.cnpj || f.telefone || '',
  },
  {
    // Compartilhado com Geotecnologia (ver CadastrosGeoScreen.tsx) — mesma
    // tabela status_ativo no backend.
    key: 'status-ativo',
    label: 'Status',
    fields: [{ key: 'nome', label: 'Nome', required: true }],
    subtitle: () => '',
  },
];

async function listFor(key: TabConfig['key']): Promise<any[]> {
  if (key === 'tipos-equipamento') return repository.listTiposEquipamento(false);
  if (key === 'setores') return repository.listSetores(false);
  if (key === 'status-ativo') return repository.listStatusAtivo(false);
  return repository.listFornecedores(false);
}

async function createFor(key: TabConfig['key'], body: any) {
  if (key === 'tipos-equipamento') return repository.createTipoEquipamento(body);
  if (key === 'setores') return repository.createSetor(body);
  if (key === 'status-ativo') return repository.createStatusAtivo(body);
  return repository.createFornecedor(body);
}

async function updateFor(key: TabConfig['key'], id: number, body: any) {
  if (key === 'tipos-equipamento') return repository.updateTipoEquipamento(id, body);
  if (key === 'setores') return repository.updateSetor(id, body);
  if (key === 'status-ativo') return repository.updateStatusAtivo(id, body);
  return repository.updateFornecedor(id, body);
}

async function deleteFor(key: TabConfig['key'], id: number) {
  if (key === 'tipos-equipamento') return repository.deleteTipoEquipamento(id);
  if (key === 'setores') return repository.deleteSetor(id);
  if (key === 'status-ativo') return repository.deleteStatusAtivo(id);
  return repository.deleteFornecedor(id);
}

function emptyForm(tab: TabConfig): Record<string, string> {
  return tab.fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
}

export function CadastrosScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Cadastros'>>();
  const insets = useSafeAreaInsets();
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [activeTabKey, setActiveTabKey] = useState<TabConfig['key']>(route.params?.tab ?? 'tipos-equipamento');
  const tab = TABS.find((t) => t.key === activeTabKey)!;

  const [items, setItems] = useState<(Setor | TipoEquipamento | Fornecedor)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm(tab));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFor(activeTabKey);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [activeTabKey]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm(tab));
    setShowForm(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm(tab.fields.reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] || '' }), {}));
    setShowForm(true);
  }

  async function handleSave() {
    const missingField = tab.fields.find((f) => f.required && !form[f.key]?.trim());
    if (missingField) {
      showToast(`Preencha: ${missingField.label}`);
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      for (const f of tab.fields) {
        if (form[f.key]) body[f.key] = form[f.key].trim();
      }
      if (editingId) {
        await updateFor(activeTabKey, editingId, body);
        showToast('Registro atualizado.');
      } else {
        await createFor(activeTabKey, body);
        showToast('Registro criado.');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(item: any) {
    try {
      await updateFor(activeTabKey, item.id, { ativo: !item.ativo });
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível atualizar.');
    }
  }

  async function remove(item: any) {
    try {
      await deleteFor(activeTabKey, item.id);
      showToast('Registro removido.');
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível remover.');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Cadastros</Text>
        {podeCriar('cadastros') && (
          <Pressable style={styles.addBtn} onPress={openNew}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} active={t.key === activeTabKey} onPress={() => setActiveTabKey(t.key)} />
        ))}
      </ScrollView>

      {loading && <View style={styles.center}><Text style={styles.emptyText}>Carregando…</Text></View>}

      {!loading && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Nenhum registro cadastrado.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{(item as any).nome}</Text>
                {!!tab.subtitle(item) && <Text style={styles.rowSubtitle}>{tab.subtitle(item)}</Text>}
              </View>
              {podeEditar('cadastros') && (
                <Switch
                  value={(item as any).ativo}
                  onValueChange={() => toggleAtivo(item)}
                  trackColor={{ false: colors.border, true: colors.accentGradientFrom }}
                  thumbColor="#fff"
                />
              )}
              {podeEditar('cadastros') && (
                <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <Feather name="edit-2" size={15} color={colors.textSecondary} />
                </Pressable>
              )}
              {podeExcluir('cadastros') && (
                <Pressable style={styles.iconBtn} onPress={() => remove(item)}>
                  <Feather name="trash-2" size={15} color={colors.danger} />
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} heightPercent={0.55}>
        <Text style={styles.sheetTitle}>{editingId ? `Editar ${tab.label}` : `Novo em ${tab.label}`}</Text>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {tab.fields.map((f) => (
            <FormField
              key={f.key}
              label={f.label}
              required={f.required}
              value={form[f.key] || ''}
              onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
            />
          ))}
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
  // flexGrow:0 evita que o ScrollView horizontal (flexGrow:1 por padrão)
  // ocupe a altura livre da tela e estique os chips das abas
  tabsScroll: { flexGrow: 0, marginBottom: spacing.md },
  tabsRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center' },
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
