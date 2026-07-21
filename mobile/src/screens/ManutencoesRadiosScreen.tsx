import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { StatusOsSheet } from '../components/StatusOsSheet';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';
import { ManutencaoRadio, STATUS_MANUTENCAO, StatusManutencao, statusManutencaoLabel } from '../types/models';
import { RootStackParamList } from '../navigation/types';
import { NovaOsRadioSheet } from '../sheets/NovaOsRadioSheet';
import { DetalheOsRadioSheet } from '../sheets/DetalheOsRadioSheet';

type Filter = 'Todos' | StatusManutencao;
const FILTERS: Filter[] = ['Todos', ...STATUS_MANUTENCAO];

type Nav = NativeStackNavigationProp<RootStackParamList>;

function statusManutencaoColor(status: StatusManutencao): string {
  if (status === 'Concluida') return colors.accent;
  if (status === 'Em andamento') return colors.statusEstoque;
  return colors.statusManutencao;
}

export function ManutencoesRadiosScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { manutencoesRadios, insumos, alterarStatusOsRadio } = useAppData();
  const { podeCriar, podeEditar } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  const [osSheetVisible, setOsSheetVisible] = useState(false);
  const [statusSheetItem, setStatusSheetItem] = useState<ManutencaoRadio | null>(null);
  const [detalheItem, setDetalheItem] = useState<ManutencaoRadio | null>(null);

  function changeStatus(item: ManutencaoRadio) {
    if (!podeEditar('manutencoesRadios')) return;
    setStatusSheetItem(item);
  }

  const counts = useMemo(() => {
    const map: Record<Filter, number> = { Todos: manutencoesRadios.length, Aberta: 0, 'Em andamento': 0, Concluida: 0 };
    for (const m of manutencoesRadios) map[m.status] += 1;
    return map;
  }, [manutencoesRadios]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return manutencoesRadios.filter((m) => {
      if (filter !== 'Todos' && m.status !== filter) return false;
      if (!q) return true;
      return (
        m.os.toLowerCase().includes(q) ||
        m.titulo.toLowerCase().includes(q) ||
        (m.radio?.numeroSerie || '').toLowerCase().includes(q) ||
        (m.frota ? `${m.frota.numero} ${m.frota.nome}` : '').toLowerCase().includes(q) ||
        (m.tecnico || '').toLowerCase().includes(q)
      );
    });
  }, [manutencoesRadios, filter, query]);

  const hasActiveFilter = filter !== 'Todos' || query.trim().length > 0;

  const renderItem = ({ item }: { item: ManutencaoRadio }) => {
    const color = item.pendingSync ? colors.statusManutencao : statusManutencaoColor(item.status);
    return (
      <Pressable
        style={styles.row}
        onPress={() => setDetalheItem(item)}
      >
        <View style={styles.rowTop}>
          <Text style={styles.os}>{item.os}</Text>
          <Pressable
            disabled={!!item.pendingSync}
            onPress={() => changeStatus(item)}
            style={[styles.statusBadge, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) }]}
          >
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>
              {item.pendingSync ? 'Aguardando sincronização' : statusManutencaoLabel(item.status)}
            </Text>
            {podeEditar('manutencoesRadios') && !item.pendingSync && (
              <Feather name="chevron-down" size={11} color={color} />
            )}
          </Pressable>
        </View>
        <Text style={styles.titulo} numberOfLines={1}>{item.titulo}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.radio ? `${item.radio.numeroSerie} · ${item.radio.modelo || 'Rádio'}` : item.frota ? `Frota ${item.frota.numero} · ${item.frota.nome}` : '—'}
        </Text>
        <Text style={styles.meta}>
          {item.tipo} · {item.tecnico || 'sem técnico'} · {formatDate(item.data)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {navigation.canGoBack() && (
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={20} color={colors.text} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>Manutenções (Rádios)</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar OS, título, nº de série…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        {podeCriar('manutencoesRadios') && (
          <Pressable style={styles.addBtn} onPress={() => setOsSheetVisible(true)}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      <View style={styles.chipsWrap}>
        {FILTERS.map((item) => (
          <Chip
            key={item}
            label={item === 'Todos' ? 'Todos' : statusManutencaoLabel(item)}
            count={counts[item]}
            active={filter === item}
            onPress={() => setFilter(item)}
          />
        ))}
      </View>

      <View style={styles.counterRow}>
        <Text style={styles.counterText}>{filtered.length} MANUTENÇÕES</Text>
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
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="tool" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nada encontrado.</Text>
          </View>
        }
      />

      <NovaOsRadioSheet visible={osSheetVisible} onClose={() => setOsSheetVisible(false)} />

      <DetalheOsRadioSheet visible={!!detalheItem} onClose={() => setDetalheItem(null)} item={detalheItem} />

      <StatusOsSheet
        visible={!!statusSheetItem}
        onClose={() => setStatusSheetItem(null)}
        os={statusSheetItem?.os || ''}
        currentStatus={statusSheetItem?.status || 'Aberta'}
        insumoRequiredFor={statusSheetItem?.insumos.length ? [] : ['Concluida']}
        insumos={insumos}
        onConfirm={(status, insumoIds) => statusSheetItem && alterarStatusOsRadio(statusSheetItem.id, status, insumoIds)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
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
    paddingBottom: 60,
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
  os: {
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
  titulo: {
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
