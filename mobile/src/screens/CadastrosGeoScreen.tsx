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
import { AreaGeo, FornecedorGeo, Frota, Insumo, StatusAtivo, Transportadora } from '../types/models';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
}

interface TabConfig {
  key: 'frotas' | 'areas-geo' | 'status-ativo' | 'insumos' | 'transportadoras' | 'fornecedores-geo';
  label: string;
  fields: FieldConfig[];
  title: (item: any) => string;
  subtitle: (item: any) => string;
}

const TABS: TabConfig[] = [
  {
    key: 'frotas',
    label: 'Frotas',
    fields: [
      { key: 'numero', label: 'Número', required: true },
      { key: 'nome', label: 'Nome', required: true },
    ],
    title: (f: Frota) => f.nome,
    subtitle: (f: Frota) => `Frota ${f.numero}`,
  },
  {
    key: 'areas-geo',
    label: 'Áreas',
    fields: [{ key: 'nome', label: 'Nome', required: true }],
    title: (a: AreaGeo) => a.nome,
    subtitle: () => '',
  },
  {
    // Compartilhado com TI (ver CadastrosScreen.tsx) — mesma tabela
    // status_ativo no backend.
    key: 'status-ativo',
    label: 'Status',
    fields: [{ key: 'nome', label: 'Nome', required: true }],
    title: (s: StatusAtivo) => s.nome,
    subtitle: () => '',
  },
  {
    // Itens usados na manutenção de rádios — a OS exige escolher um destes
    // em vez de digitar um título livre (ver NovaOsRadioSheet.tsx).
    key: 'insumos',
    label: 'Insumos',
    fields: [{ key: 'nome', label: 'Nome', required: true }],
    title: (i: Insumo) => i.nome,
    subtitle: () => '',
  },
  {
    // Usadas na Gestão de Ocorrências (envio de rádios para reparo externo).
    key: 'transportadoras',
    label: 'Transportadoras',
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
    ],
    title: (t: Transportadora) => t.nome,
    subtitle: (t: Transportadora) => t.cnpj || '',
  },
  {
    // Fornecedor próprio da Geotecnologia — não é o mesmo cadastro de
    // Fornecedores de TI (ver CadastrosScreen.tsx).
    key: 'fornecedores-geo',
    label: 'Fornecedores',
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
    ],
    title: (f: FornecedorGeo) => f.nome,
    subtitle: (f: FornecedorGeo) => f.cnpj || '',
  },
];

async function listFor(key: TabConfig['key']): Promise<any[]> {
  if (key === 'frotas') return repository.listFrotas(false);
  if (key === 'status-ativo') return repository.listStatusAtivo(false);
  if (key === 'insumos') return repository.listInsumos(false);
  if (key === 'transportadoras') return repository.listTransportadoras(false);
  if (key === 'fornecedores-geo') return repository.listFornecedoresGeo(false);
  return repository.listAreasGeo(false);
}

async function createFor(key: TabConfig['key'], body: any) {
  if (key === 'frotas') return repository.createFrota(body);
  if (key === 'status-ativo') return repository.createStatusAtivo(body);
  if (key === 'insumos') return repository.createInsumo(body);
  if (key === 'transportadoras') return repository.createTransportadora(body);
  if (key === 'fornecedores-geo') return repository.createFornecedorGeo(body);
  return repository.createAreaGeo(body);
}

async function updateFor(key: TabConfig['key'], id: number, body: any) {
  if (key === 'frotas') return repository.updateFrota(id, body);
  if (key === 'status-ativo') return repository.updateStatusAtivo(id, body);
  if (key === 'insumos') return repository.updateInsumo(id, body);
  if (key === 'transportadoras') return repository.updateTransportadora(id, body);
  if (key === 'fornecedores-geo') return repository.updateFornecedorGeo(id, body);
  return repository.updateAreaGeo(id, body);
}

async function deleteFor(key: TabConfig['key'], id: number) {
  if (key === 'frotas') return repository.deleteFrota(id);
  if (key === 'status-ativo') return repository.deleteStatusAtivo(id);
  if (key === 'insumos') return repository.deleteInsumo(id);
  if (key === 'transportadoras') return repository.deleteTransportadora(id);
  if (key === 'fornecedores-geo') return repository.deleteFornecedorGeo(id);
  return repository.deleteAreaGeo(id);
}

function emptyForm(tab: TabConfig): Record<string, string> {
  return tab.fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
}

export function CadastrosGeoScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CadastrosGeo'>>();
  const insets = useSafeAreaInsets();
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [activeTabKey, setActiveTabKey] = useState<TabConfig['key']>(route.params?.tab ?? 'frotas');
  const tab = TABS.find((t) => t.key === activeTabKey)!;

  const [items, setItems] = useState<(Frota | AreaGeo)[]>([]);
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
        <Text style={styles.headerTitle}>Cadastros (Geo)</Text>
        {podeCriar('cadastrosGeo') && (
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
                <Text style={styles.rowTitle}>{tab.title(item)}</Text>
                {!!tab.subtitle(item) && <Text style={styles.rowSubtitle}>{tab.subtitle(item)}</Text>}
              </View>
              {podeEditar('cadastrosGeo') && (
                <Switch
                  value={(item as any).ativo}
                  onValueChange={() => toggleAtivo(item)}
                  trackColor={{ false: colors.border, true: colors.accentGradientFrom }}
                  thumbColor="#fff"
                />
              )}
              {podeEditar('cadastrosGeo') && (
                <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <Feather name="edit-2" size={15} color={colors.textSecondary} />
                </Pressable>
              )}
              {podeExcluir('cadastrosGeo') && (
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
