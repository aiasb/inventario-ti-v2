import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { BottomSheet } from '../components/BottomSheet';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { repository } from '../data/repository';
import { AreaGeo, FornecedorGeo, Frota, Insumo, ModeloRadio, Radio, ResponsavelGeo, StatusAtivo, Transportadora, radioTipoLabel } from '../types/models';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
}

interface TabConfig {
  key: 'frotas' | 'areas-geo' | 'responsaveis' | 'modelos' | 'status-ativo' | 'insumos' | 'transportadoras' | 'fornecedores-geo';
  label: string;
  fields?: FieldConfig[];
  title?: (item: any) => string;
  subtitle?: (item: any) => string;
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
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'sigla', label: 'Sigla' },
    ],
    title: (a: AreaGeo) => a.nome,
    subtitle: (a: AreaGeo) => a.sigla || '',
  },
  {
    // Não usa a lista genérica abaixo — tem busca e coluna calculada (rádios
    // alocados), então é renderizado à parte (ver ResponsaveisTab).
    key: 'responsaveis',
    label: 'Responsáveis',
  },
  {
    // Idem — busca multi-campo e coluna calculada "Quantidade de rádios"
    // (ver ModelosTab). Independente do campo texto radio.modelo — a
    // contagem compara por nome (correspondência aproximada).
    key: 'modelos',
    label: 'Modelos',
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
  return (tab.fields || []).reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
}

export function CadastrosGeoScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CadastrosGeo'>>();
  const insets = useSafeAreaInsets();
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [activeTabKey, setActiveTabKey] = useState<TabConfig['key']>(route.params?.tab ?? 'frotas');
  const tab = TABS.find((t) => t.key === activeTabKey)!;
  const isResponsaveis = activeTabKey === 'responsaveis';
  const isModelos = activeTabKey === 'modelos';
  const isTabelaGenerica = !isResponsaveis && !isModelos;

  const [items, setItems] = useState<(Frota | AreaGeo)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm(tab));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isTabelaGenerica) return;
    setLoading(true);
    try {
      const data = await listFor(activeTabKey);
      setItems(data);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setForm((tab.fields || []).reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] || '' }), {}));
    setShowForm(true);
  }

  async function handleSave() {
    const missingField = (tab.fields || []).find((f) => f.required && !form[f.key]?.trim());
    if (missingField) {
      showToast(`Preencha: ${missingField.label}`);
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      for (const f of tab.fields || []) {
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
        {isTabelaGenerica && podeCriar('cadastrosGeo') && (
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

      {isResponsaveis && <ResponsaveisTab />}
      {isModelos && <ModelosTab />}
      {isTabelaGenerica && (
        <>
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
                    <Text style={styles.rowTitle}>{tab.title!(item)}</Text>
                    {!!tab.subtitle!(item) && <Text style={styles.rowSubtitle}>{tab.subtitle!(item)}</Text>}
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
        </>
      )}

      {isTabelaGenerica && (
        <BottomSheet visible={showForm} onClose={() => setShowForm(false)} heightPercent={0.55}>
          <Text style={styles.sheetTitle}>{editingId ? `Editar ${tab.label}` : `Novo em ${tab.label}`}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {(tab.fields || []).map((f) => (
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
      )}
    </View>
  );
}

const SEM_AREA = 'Sem área';

function emptyResponsavelForm() {
  return { matricula: '', nome: '', setor: '', legenda: '', areaNome: SEM_AREA, ativo: true };
}

function ResponsaveisTab() {
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<ResponsavelGeo[]>([]);
  const [areas, setAreas] = useState<AreaGeo[]>([]);
  const [radios, setRadios] = useState<Radio[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyResponsavelForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resp, areaList, radioList] = await Promise.all([
        repository.listResponsaveisGeo(false),
        repository.listAreasGeo(false),
        repository.listRadios(),
      ]);
      setItems(resp);
      setAreas(areaList);
      setRadios(radioList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A coluna "Área" mostra a sigla cadastrada na aba Áreas (não o nome
  // completo) — cai para o nome só se a área não tiver sigla.
  function areaSigla(areaId: number | null): string {
    const area = areas.find((a) => a.id === areaId);
    if (!area) return '';
    return area.sigla || area.nome || '';
  }

  const radiosPorResponsavel = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of radios) {
      if (!r.responsavel) continue;
      map.set(r.responsavel.id, (map.get(r.responsavel.id) || 0) + 1);
    }
    return map;
  }, [radios]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        (r.setor || '').toLowerCase().includes(q) ||
        areaSigla(r.areaId).toLowerCase().includes(q) ||
        (r.legenda || '').toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, areas]);

  function openNew() {
    setEditingId(null);
    setForm(emptyResponsavelForm());
    setShowForm(true);
  }

  function openEdit(item: ResponsavelGeo) {
    setEditingId(item.id);
    setForm({
      matricula: item.matricula || '',
      nome: item.nome,
      setor: item.setor || '',
      legenda: item.legenda || '',
      areaNome: areas.find((a) => a.id === item.areaId)?.nome || SEM_AREA,
      ativo: item.ativo,
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
        setor: form.setor.trim() || null,
        legenda: form.legenda.trim() || null,
        areaId: area?.id || null,
        ativo: form.ativo,
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
    <View style={{ flex: 1 }}>
      <View style={styles.responsaveisSearchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nome, setor, área ou legenda…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        {podeCriar('responsaveisGeo') && (
          <Pressable style={styles.addBtn} onPress={openNew}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      {loading && <View style={styles.center}><Text style={styles.emptyText}>Carregando…</Text></View>}

      {!loading && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Nenhum responsável encontrado.</Text></View>}
          renderItem={({ item }) => {
            const count = radiosPorResponsavel.get(item.id) || 0;
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.responsavelTopRow}>
                    <Text style={styles.rowTitle}>{item.nome}</Text>
                    {!!item.legenda && (
                      <View style={styles.legendaBadge}>
                        <Text style={styles.legendaText}>{item.legenda}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rowSubtitle}>
                    {item.setor || 'sem setor'} · {areaSigla(item.areaId) || 'sem área'}
                  </Text>
                  <Text style={styles.rowSubtitle}>{count} rádio{count === 1 ? '' : 's'} alocado{count === 1 ? '' : 's'}</Text>
                </View>
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
            );
          }}
        />
      )}

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} heightPercent={0.85}>
        <Text style={styles.sheetTitle}>{editingId ? 'Editar responsável' : 'Novo responsável'}</Text>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FormField label="Nome" required value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} />
          <FormField label="Matrícula" value={form.matricula} onChangeText={(v) => setForm((f) => ({ ...f, matricula: v }))} />
          <FormField label="Setor" value={form.setor} onChangeText={(v) => setForm((f) => ({ ...f, setor: v }))} />
          <FormField label="Legenda" placeholder="Ex.: IN" value={form.legenda} onChangeText={(v) => setForm((f) => ({ ...f, legenda: v }))} />
          <SelectField label="Área" value={form.areaNome} options={areaOptions} onChange={(v) => setForm((f) => ({ ...f, areaNome: v }))} />
          {editingId && (
            <View style={styles.ativoRow}>
              <Text style={styles.ativoLabel}>Ativo</Text>
              <Switch
                value={form.ativo}
                onValueChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                trackColor={{ false: colors.border, true: colors.accentGradientFrom }}
                thumbColor="#fff"
              />
            </View>
          )}
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

function emptyModeloForm() {
  return { codigoChb: '', nome: '', serial: '', tipo: '', valor: '', ativo: true };
}

function formatCurrencyBR(valor: string | number | null): string {
  const n = Number(valor);
  if (!valor || Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ModelosTab() {
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<ModeloRadio[]>([]);
  const [radios, setRadios] = useState<Radio[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyModeloForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [modelos, radioList] = await Promise.all([
        repository.listModelosRadio(false),
        repository.listRadios(),
      ]);
      setItems(modelos);
      setRadios(radioList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // "Quantidade de rádios" compara o texto de radio.modelo com o nome
  // cadastrado aqui (sem FK — não há vínculo entre as duas tabelas).
  const radiosPorModelo = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of radios) {
      if (!r.modelo) continue;
      const key = r.modelo.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [radios]);

  function quantidadeFor(nome: string): number {
    return radiosPorModelo.get(nome.trim().toLowerCase()) || 0;
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (m) =>
        (m.codigoChb || '').toLowerCase().includes(q) ||
        m.nome.toLowerCase().includes(q) ||
        (m.serial || '').toLowerCase().includes(q) ||
        radioTipoLabel(m.tipo).toLowerCase().includes(q) ||
        String(m.valor || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  function openNew() {
    setEditingId(null);
    setForm(emptyModeloForm());
    setShowForm(true);
  }

  function openEdit(item: ModeloRadio) {
    setEditingId(item.id);
    setForm({
      codigoChb: item.codigoChb || '',
      nome: item.nome,
      serial: item.serial || '',
      tipo: item.tipo || '',
      valor: item.valor || '',
      ativo: item.ativo,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      showToast('Preencha o nome.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        codigoChb: form.codigoChb.trim() || null,
        nome: form.nome.trim(),
        serial: form.serial.trim() || null,
        tipo: form.tipo || null,
        valor: form.valor ? Number(form.valor) : null,
        ativo: form.ativo,
      };
      if (editingId) {
        await repository.updateModeloRadio(editingId, body);
        showToast('Modelo atualizado.');
      } else {
        await repository.createModeloRadio(body);
        showToast('Modelo criado.');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ModeloRadio) {
    try {
      await repository.deleteModeloRadio(item.id);
      showToast('Modelo removido.');
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível remover.');
    }
  }

  const tipoOptions = ['—', 'Móvel', 'Portátil'];
  const tipoParaValor: Record<string, string> = { Móvel: 'Movel', Portátil: 'Portatil', '—': '' };
  const valorParaTipo: Record<string, string> = { Movel: 'Móvel', Portatil: 'Portátil', '': '—' };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.responsaveisSearchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Código, nome, serial, tipo ou valor…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        {podeCriar('cadastrosGeo') && (
          <Pressable style={styles.addBtn} onPress={openNew}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      {loading && <View style={styles.center}><Text style={styles.emptyText}>Carregando…</Text></View>}

      {!loading && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Nenhum modelo encontrado.</Text></View>}
          renderItem={({ item }) => {
            const count = quantidadeFor(item.nome);
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.nome}</Text>
                  <Text style={styles.rowSubtitle}>
                    {item.codigoChb || 'sem código'} · {radioTipoLabel(item.tipo)} · {formatCurrencyBR(item.valor)}
                  </Text>
                  <Text style={styles.rowSubtitle}>{count} rádio{count === 1 ? '' : 's'} deste modelo</Text>
                </View>
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
            );
          }}
        />
      )}

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} heightPercent={0.85}>
        <Text style={styles.sheetTitle}>{editingId ? 'Editar modelo' : 'Novo modelo'}</Text>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FormField label="Código do CHB" value={form.codigoChb} onChangeText={(v) => setForm((f) => ({ ...f, codigoChb: v }))} />
          <FormField label="Nome" required value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} />
          <FormField label="Serial" value={form.serial} onChangeText={(v) => setForm((f) => ({ ...f, serial: v }))} />
          <SelectField
            label="Tipo"
            value={valorParaTipo[form.tipo] || '—'}
            options={tipoOptions}
            onChange={(v) => setForm((f) => ({ ...f, tipo: tipoParaValor[v] || '' }))}
          />
          <FormField
            label="Valor"
            value={form.valor}
            onChangeText={(v) => setForm((f) => ({ ...f, valor: v }))}
            keyboardType="decimal-pad"
          />
          {editingId && (
            <View style={styles.ativoRow}>
              <Text style={styles.ativoLabel}>Ativo</Text>
              <Switch
                value={form.ativo}
                onValueChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                trackColor={{ false: colors.border, true: colors.accentGradientFrom }}
                thumbColor="#fff"
              />
            </View>
          )}
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
  responsaveisSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceFrom,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    height: 44,
  },
  responsavelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(87,178,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(87,178,94,0.32)',
  },
  legendaText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
    color: colors.accent,
  },
  ativoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  ativoLabel: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.text },
});
