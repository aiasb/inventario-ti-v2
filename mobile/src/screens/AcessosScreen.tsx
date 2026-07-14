import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { MODULOS, ModulePermission, Perfil, UsuarioAdmin } from '../types/models';
import { RootStackParamList } from '../navigation/types';
import { initials } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ACOES: { key: keyof ModulePermission; label: string }[] = [
  { key: 'podeVer', label: 'Ver' },
  { key: 'podeCriar', label: 'Criar' },
  { key: 'podeEditar', label: 'Editar' },
  { key: 'podeExcluir', label: 'Excluir' },
];

function emptyPermissoes(): Record<string, ModulePermission> {
  const out: Record<string, ModulePermission> = {};
  for (const m of MODULOS) out[m.key] = { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false };
  return out;
}

export function AcessosScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'usuarios' | 'perfis'>('usuarios');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Acessos</Text>
      </View>

      <View style={styles.tabsRow}>
        <Chip label="Usuários" active={tab === 'usuarios'} onPress={() => setTab('usuarios')} />
        <Chip label="Perfis de acesso" active={tab === 'perfis'} onPress={() => setTab('perfis')} />
      </View>

      {tab === 'usuarios' ? <UsuariosTab /> : <PerfisTab />}
    </View>
  );
}

function emptyUsuarioForm() {
  return { nome: '', email: '', senha: '', cargo: '', perfilId: null as number | null, perfilNome: '' };
}

function UsuariosTab() {
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyUsuarioForm());
  const [saving, setSaving] = useState(false);
  const [tempSenha, setTempSenha] = useState<{ usuario: UsuarioAdmin; senha: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p] = await Promise.all([repository.listUsuarios(), repository.listPerfis()]);
      setUsuarios(u);
      setPerfis(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingId(null);
    const consulta = perfis.find((p) => p.nome === 'Consulta') || perfis[0];
    setForm({ ...emptyUsuarioForm(), perfilId: consulta?.id ?? null, perfilNome: consulta?.nome || '' });
    setShowForm(true);
  }

  function openEdit(u: UsuarioAdmin) {
    setEditingId(u.id);
    setForm({ nome: u.nome, email: u.email, senha: '', cargo: u.cargo || '', perfilId: u.perfilId, perfilNome: u.perfil });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.email.trim() || (!editingId && !form.senha.trim())) {
      showToast('Preencha nome, e-mail e senha.');
      return;
    }
    setSaving(true);
    try {
      const body: any = { nome: form.nome.trim(), email: form.email.trim(), cargo: form.cargo.trim() || undefined, perfilId: form.perfilId || undefined };
      if (form.senha.trim()) body.senha = form.senha.trim();
      if (editingId) {
        await repository.updateUsuario(editingId, body);
        showToast('Usuário atualizado.');
      } else {
        await repository.createUsuario(body);
        showToast('Usuário criado.');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(u: UsuarioAdmin) {
    try {
      await repository.toggleUsuarioAtivo(u.id, !u.ativo);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível atualizar.');
    }
  }

  async function toggleBloqueado(u: UsuarioAdmin) {
    try {
      await repository.toggleUsuarioBloqueado(u.id, !u.bloqueado);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível atualizar.');
    }
  }

  function resetarSenha(u: UsuarioAdmin) {
    Alert.alert('Resetar senha', `Gerar uma nova senha temporária para ${u.nome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Gerar',
        onPress: async () => {
          try {
            const res = await repository.resetarSenhaUsuario(u.id);
            setTempSenha({ usuario: u, senha: res.senhaTemporaria });
          } catch (err: any) {
            showToast(err?.message || 'Não foi possível resetar a senha.');
          }
        },
      },
    ]);
  }

  function remove(u: UsuarioAdmin) {
    Alert.alert('Excluir usuário', `Excluir ${u.nome}? Essa ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await repository.deleteUsuario(u.id);
            showToast('Usuário excluído.');
            await load();
          } catch (err: any) {
            showToast(err?.message || 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }

  return (
    <>
      {loading && <View style={styles.center}><Text style={styles.emptyText}>Carregando…</Text></View>}

      {!loading && (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Nenhum usuário cadastrado.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <View style={styles.userTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.nome)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.nome}</Text>
                  <Text style={styles.rowSubtitle}>{item.email} · {item.perfil}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.badge, { backgroundColor: item.ativo ? 'rgba(87,178,94,0.14)' : 'rgba(139,150,162,0.14)' }]}>
                    <Text style={[styles.badgeText, { color: item.ativo ? colors.accent : colors.textMuted }]}>{item.ativo ? 'Ativo' : 'Inativo'}</Text>
                  </View>
                  {item.bloqueado && (
                    <View style={[styles.badge, { backgroundColor: 'rgba(217,92,74,0.14)' }]}>
                      <Text style={[styles.badgeText, { color: colors.danger }]}>Bloqueado</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.actionsRow}>
                {podeEditar('acessos') && (
                  <Pressable style={styles.actionChip} onPress={() => openEdit(item)}>
                    <Text style={styles.actionChipText}>Editar</Text>
                  </Pressable>
                )}
                {podeEditar('acessos') && (
                  <Pressable style={styles.actionChip} onPress={() => resetarSenha(item)}>
                    <Text style={styles.actionChipText}>Resetar senha</Text>
                  </Pressable>
                )}
                {podeEditar('acessos') && (
                  <Pressable style={styles.actionChip} onPress={() => toggleAtivo(item)}>
                    <Text style={styles.actionChipText}>{item.ativo ? 'Desativar' : 'Ativar'}</Text>
                  </Pressable>
                )}
                {podeEditar('acessos') && (
                  <Pressable style={styles.actionChip} onPress={() => toggleBloqueado(item)}>
                    <Text style={styles.actionChipText}>{item.bloqueado ? 'Desbloquear' : 'Bloquear'}</Text>
                  </Pressable>
                )}
                {podeExcluir('acessos') && (
                  <Pressable style={[styles.actionChip, styles.dangerChip]} onPress={() => remove(item)}>
                    <Feather name="trash-2" size={13} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}

      {podeCriar('acessos') && (
        <Pressable style={styles.fab} onPress={openNew}>
          <Feather name="plus" size={22} color="#06210b" />
        </Pressable>
      )}

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} heightPercent={0.7}>
        <Text style={styles.sheetTitle}>{editingId ? 'Editar usuário' : 'Novo usuário'}</Text>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FormField label="Nome" required value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} />
          <FormField label="E-mail" required autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
          <FormField
            label={editingId ? 'Nova senha (opcional)' : 'Senha inicial'}
            required={!editingId}
            secureTextEntry
            placeholder={editingId ? 'Deixe em branco para manter' : ''}
            value={form.senha}
            onChangeText={(v) => setForm((f) => ({ ...f, senha: v }))}
          />
          <SelectField
            label="Perfil"
            value={form.perfilNome}
            options={perfis.map((p) => p.nome)}
            onChange={(v) => {
              const p = perfis.find((pp) => pp.nome === v);
              setForm((f) => ({ ...f, perfilNome: v, perfilId: p?.id ?? null }));
            }}
          />
          <FormField label="Cargo" value={form.cargo} onChangeText={(v) => setForm((f) => ({ ...f, cargo: v }))} />
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar usuário'}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet visible={!!tempSenha} onClose={() => setTempSenha(null)} heightPercent={0.4}>
        <Text style={styles.sheetTitle}>Senha temporária gerada</Text>
        <Text style={styles.helpText}>
          Copie a senha abaixo (toque e segure para selecionar) e informe a {tempSenha?.usuario.nome} por um canal
          seguro — ela não será exibida novamente.
        </Text>
        <Text selectable style={styles.tempSenhaText}>{tempSenha?.senha}</Text>
        <Pressable style={styles.saveBtn} onPress={() => setTempSenha(null)}>
          <Text style={styles.saveText}>Concluído</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

function emptyPerfilForm() {
  return { nome: '', descricao: '', permissoes: emptyPermissoes() };
}

function PerfisTab() {
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();

  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyPerfilForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPerfis(await repository.listPerfis());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(emptyPerfilForm());
    setShowForm(true);
  }

  function openEdit(p: Perfil) {
    setEditingId(p.id);
    const permissoes = emptyPermissoes();
    for (const m of MODULOS) {
      if (p.permissoes[m.key]) permissoes[m.key] = { ...p.permissoes[m.key] };
    }
    setForm({ nome: p.nome, descricao: p.descricao || '', permissoes });
    setShowForm(true);
  }

  function toggleCell(moduloKey: string, acao: keyof ModulePermission) {
    setForm((f) => ({
      ...f,
      permissoes: {
        ...f.permissoes,
        [moduloKey]: { ...f.permissoes[moduloKey], [acao]: !f.permissoes[moduloKey][acao] },
      },
    }));
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      showToast('Preencha o nome do perfil.');
      return;
    }
    setSaving(true);
    try {
      const body = { nome: form.nome.trim(), descricao: form.descricao.trim() || undefined, permissoes: form.permissoes };
      if (editingId) {
        await repository.updatePerfil(editingId, body);
        showToast('Perfil atualizado.');
      } else {
        await repository.createPerfil(body);
        showToast('Perfil criado.');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function remove(p: Perfil) {
    Alert.alert('Excluir perfil', `Excluir o perfil "${p.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await repository.deletePerfil(p.id);
            showToast('Perfil excluído.');
            await load();
          } catch (err: any) {
            showToast(err?.message || 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }

  return (
    <>
      {loading && <View style={styles.center}><Text style={styles.emptyText}>Carregando…</Text></View>}

      {!loading && (
        <FlatList
          data={perfis}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Nenhum perfil cadastrado.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.nome}</Text>
                {!!item.descricao && <Text style={styles.rowSubtitle}>{item.descricao}</Text>}
              </View>
              {podeEditar('acessos') && (
                <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <Feather name="edit-2" size={15} color={colors.textSecondary} />
                </Pressable>
              )}
              {podeExcluir('acessos') && (
                <Pressable style={styles.iconBtn} onPress={() => remove(item)}>
                  <Feather name="trash-2" size={15} color={colors.danger} />
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      {podeCriar('acessos') && (
        <Pressable style={styles.fab} onPress={openNew}>
          <Feather name="plus" size={22} color="#06210b" />
        </Pressable>
      )}

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} heightPercent={0.85}>
        <Text style={styles.sheetTitle}>{editingId ? 'Editar perfil' : 'Novo perfil'}</Text>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FormField label="Nome" required value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} />
          <FormField label="Descrição" value={form.descricao} onChangeText={(v) => setForm((f) => ({ ...f, descricao: v }))} />

          <Text style={styles.matrixTitle}>Permissões por módulo</Text>
          <View style={styles.matrixHeaderRow}>
            <Text style={styles.matrixModuloHeader}> </Text>
            {ACOES.map((a) => (
              <Text key={a.key} style={styles.matrixColHeader}>{a.label}</Text>
            ))}
          </View>
          {MODULOS.map((m) => (
            <View key={m.key} style={styles.matrixRow}>
              <Text style={styles.matrixModulo}>{m.label}</Text>
              {ACOES.map((a) => (
                <Pressable key={a.key} style={styles.matrixCell} onPress={() => toggleCell(m.key, a.key)}>
                  <View style={[styles.checkbox, form.permissoes[m.key]?.[a.key] && styles.checkboxChecked]}>
                    {form.permissoes[m.key]?.[a.key] && <Feather name="check" size={12} color="#06210b" />}
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar perfil'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </>
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
  tabsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  center: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 90 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  rowSubtitle: { fontFamily: fonts.bodyRegular, fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  userRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, gap: 10 },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTo,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.titleSemiBold, fontSize: 12, color: colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontFamily: fonts.monoMedium, fontSize: 10 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceFrom,
  },
  actionChipText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.textSecondary },
  dangerChip: { borderColor: 'rgba(217,92,74,0.35)', backgroundColor: 'rgba(217,92,74,0.1)' },
  fab: {
    position: 'absolute', right: spacing.xl, bottom: spacing.xl,
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  sheetTitle: { fontFamily: fonts.titleSemiBold, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  helpText: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  tempSenhaText: {
    fontFamily: fonts.monoSemiBold, fontSize: 20, color: colors.accent, textAlign: 'center',
    paddingVertical: spacing.lg, marginBottom: spacing.md,
  },
  matrixTitle: { fontFamily: fonts.titleSemiBold, fontSize: 14, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  matrixHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  matrixModuloHeader: { flex: 1.4 },
  matrixColHeader: { flex: 1, fontFamily: fonts.mono, fontSize: 9.5, color: colors.textMuted, textAlign: 'center' },
  matrixRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  matrixModulo: { flex: 1.4, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.text },
  matrixCell: { flex: 1, alignItems: 'center' },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
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
