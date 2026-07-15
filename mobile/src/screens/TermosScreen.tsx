import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Chip } from '../components/Chip';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { formatDate } from '../utils/format';
import { visualizarBaixarTermoPdf } from '../utils/termoPdf';
import { Termo } from '../types/models';
import { NovoTermoSheet } from '../sheets/NovoTermoSheet';

type Filter = 'Todos' | 'Assinados' | 'Pendentes';
const FILTERS: Filter[] = ['Todos', 'Assinados', 'Pendentes'];

export function TermosScreen() {
  const { termos, alternarAssinaturaTermo, alternarDevolucaoTermo, excluirTermo } = useAppData();
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { showToast } = useToast();
  const { refreshing, onRefresh } = useRefreshControl();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);
  const [termoSheetVisible, setTermoSheetVisible] = useState(false);

  const counts = useMemo(() => {
    let assinados = 0;
    for (const t of termos) if (t.assinado) assinados += 1;
    return { Todos: termos.length, Assinados: assinados, Pendentes: termos.length - assinados };
  }, [termos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return termos.filter((t) => {
      if (filter === 'Assinados' && !t.assinado) return false;
      if (filter === 'Pendentes' && t.assinado) return false;
      if (!q) return true;
      return t.numero.toLowerCase().includes(q) || t.colaborador.toLowerCase().includes(q);
    });
  }, [termos, filter, query]);

  const hasActiveFilter = filter !== 'Todos' || query.trim().length > 0;

  async function handleToggleAssinatura(termo: Termo) {
    setUpdatingId(termo.id);
    try {
      await alternarAssinaturaTermo(termo.id, !termo.assinado);
      showToast(termo.assinado ? `${termo.numero} marcado como pendente.` : `${termo.numero} marcado como assinado.`);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleDevolucao(termo: Termo) {
    setUpdatingId(termo.id);
    try {
      await alternarDevolucaoTermo(termo.id, !termo.devolvido);
      showToast(termo.devolvido ? `${termo.numero}: devolução desfeita.` : `${termo.numero} marcado como devolvido.`);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleVisualizarPdf(termo: Termo) {
    setPdfLoadingId(termo.id);
    try {
      await visualizarBaixarTermoPdf(termo.id, termo.numero);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível abrir o termo em PDF.');
    } finally {
      setPdfLoadingId(null);
    }
  }

  function handleDelete(termo: Termo) {
    Alert.alert('Excluir termo', `Excluir o termo ${termo.numero}? Essa ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(termo.id);
          try {
            await excluirTermo(termo.id);
            showToast(`${termo.numero} excluído.`);
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }

  const renderItem = ({ item }: { item: Termo }) => {
    const color = item.assinado ? colors.accent : colors.statusManutencao;
    const equipamentosResumo = item.equipamentos.map((e) => e.serial).join(', ') || 'sem equipamentos vinculados';
    const busy = updatingId === item.id || deletingId === item.id;
    const pdfBusy = pdfLoadingId === item.id;
    return (
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <Text style={styles.numero}>{item.numero}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) }]}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>{item.assinado ? 'Assinado' : 'Pendente'}</Text>
            </View>
            {item.devolvido && (
              <View style={[styles.statusBadge, { backgroundColor: withAlpha(colors.textMuted, 0.14), borderColor: withAlpha(colors.textMuted, 0.32) }]}>
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>Devolvido</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.colaborador} numberOfLines={1}>
          {item.colaborador}{item.cargo ? ` · ${item.cargo}` : ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>{equipamentosResumo}</Text>
        <Text style={styles.meta}>
          {formatDate(item.data)}{item.assinado && item.dataAssinatura ? ` · assinado em ${formatDate(item.dataAssinatura)}` : ''}
        </Text>

        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, pdfBusy && { opacity: 0.6 }]} disabled={pdfBusy} onPress={() => handleVisualizarPdf(item)}>
            <Feather name="file-text" size={14} color={colors.textSecondary} />
            <Text style={styles.actionText}>{pdfBusy ? 'Gerando…' : 'Visualizar/baixar (PDF)'}</Text>
          </Pressable>
          {podeEditar('termos') && (
            <Pressable style={[styles.actionBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => handleToggleAssinatura(item)}>
              <Feather name={item.assinado ? 'x-circle' : 'check-circle'} size={14} color={colors.textSecondary} />
              <Text style={styles.actionText}>{item.assinado ? 'Marcar como pendente' : 'Marcar como assinado'}</Text>
            </Pressable>
          )}
          {podeEditar('termos') && (
            <Pressable style={[styles.actionBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => handleToggleDevolucao(item)}>
              <Feather name={item.devolvido ? 'rotate-ccw' : 'package'} size={14} color={colors.textSecondary} />
              <Text style={styles.actionText}>{item.devolvido ? 'Desfazer devolução' : 'Marcar como devolvido'}</Text>
            </Pressable>
          )}
          {podeExcluir('termos') && (
            <Pressable style={[styles.actionBtn, styles.deleteBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => handleDelete(item)}>
              <Feather name="trash-2" size={14} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Excluir</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Termos" />
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar número, colaborador…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        {podeCriar('termos') && (
          <Pressable style={styles.addBtn} onPress={() => setTermoSheetVisible(true)}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      <View style={styles.chipsWrap}>
        {FILTERS.map((item) => (
          <Chip key={item} label={item} count={counts[item]} active={filter === item} onPress={() => setFilter(item)} />
        ))}
      </View>

      <View style={styles.counterRow}>
        <Text style={styles.counterText}>{filtered.length} TERMOS</Text>
        {hasActiveFilter && (
          <Pressable onPress={() => { setFilter('Todos'); setQuery(''); }}>
            <Text style={styles.clearText}>✕ Limpar</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nada encontrado.</Text>
          </View>
        }
      />

      <NovoTermoSheet visible={termoSheetVisible} onClose={() => setTermoSheetVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchRow: {
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  counterText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  clearText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceFrom,
    marginBottom: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  numero: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
  },
  colaborador: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
    marginTop: 6,
  },
  meta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteBtn: {
    borderColor: 'rgba(217,92,74,0.35)',
    backgroundColor: 'rgba(217,92,74,0.08)',
  },
  actionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
