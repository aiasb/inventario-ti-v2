import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Chip } from '../components/Chip';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { formatDate } from '../utils/format';
import { Manutencao, STATUS_MANUTENCAO, StatusManutencao, statusManutencaoLabel } from '../types/models';
import { RootStackParamList } from '../navigation/types';
import { NovaOsSheet } from '../sheets/NovaOsSheet';

type Filter = 'Todos' | StatusManutencao;
const FILTERS: Filter[] = ['Todos', ...STATUS_MANUTENCAO];

type Nav = NativeStackNavigationProp<RootStackParamList>;

function statusManutencaoColor(status: StatusManutencao): string {
  if (status === 'Concluida') return colors.accent;
  if (status === 'Em andamento') return colors.statusEstoque;
  return colors.statusManutencao;
}

export function ManutencoesScreen() {
  const navigation = useNavigation<Nav>();
  const { manutencoes } = useAppData();
  const { podeCriar } = useAuth();
  const { refreshing, onRefresh } = useRefreshControl();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  const [osSheetVisible, setOsSheetVisible] = useState(false);

  const counts = useMemo(() => {
    const map: Record<Filter, number> = { Todos: manutencoes.length, Aberta: 0, 'Em andamento': 0, Concluida: 0 };
    for (const m of manutencoes) map[m.status] += 1;
    return map;
  }, [manutencoes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return manutencoes.filter((m) => {
      if (filter !== 'Todos' && m.status !== filter) return false;
      if (!q) return true;
      return (
        m.os.toLowerCase().includes(q) ||
        m.titulo.toLowerCase().includes(q) ||
        m.equipamento.serial.toLowerCase().includes(q) ||
        (m.tecnico || '').toLowerCase().includes(q)
      );
    });
  }, [manutencoes, filter, query]);

  const hasActiveFilter = filter !== 'Todos' || query.trim().length > 0;

  const renderItem = ({ item }: { item: Manutencao }) => {
    const color = statusManutencaoColor(item.status);
    return (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('Detalhe', { id: item.equipamento.id })}
      >
        <View style={styles.rowTop}>
          <Text style={styles.os}>{item.os}</Text>
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{statusManutencaoLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.titulo} numberOfLines={1}>{item.titulo}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.equipamento.serial} · {item.equipamento.modelo}
        </Text>
        <Text style={styles.meta}>
          {item.tipo} · {item.tecnico || 'sem técnico'} · {formatDate(item.data)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Manutenções" />
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar OS, título, serial…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        {podeCriar('manutencoes') && (
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="tool" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nada encontrado.</Text>
          </View>
        }
      />

      <NovaOsSheet visible={osSheetVisible} onClose={() => setOsSheetVisible(false)} />
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
