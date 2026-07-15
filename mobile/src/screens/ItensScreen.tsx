import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Chip } from '../components/Chip';
import { EquipCard } from '../components/EquipCard';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { StatusEquipamento } from '../types/models';
import { RootStackParamList } from '../navigation/types';

type Filter = 'Todos' | StatusEquipamento;
const FILTERS: Filter[] = ['Todos', 'Ativo', 'Manutencao', 'Estoque', 'Baixado'];
const FILTER_LABEL: Record<Filter, string> = {
  Todos: 'Todos',
  Ativo: 'Ativo',
  Manutencao: 'Manutenção',
  Estoque: 'Estoque',
  Baixado: 'Baixado',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ItensScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const { equipamentos } = useAppData();
  const { refreshing, onRefresh } = useRefreshControl();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');

  useFocusEffect(
    useCallback(() => {
      const params = route.params as { statusFilter?: Filter } | undefined;
      if (params?.statusFilter) {
        setFilter(params.statusFilter);
        setQuery('');
        navigation.setParams({ statusFilter: undefined } as never);
      }
    }, [route.params, navigation])
  );

  const counts = useMemo(() => {
    const map: Record<Filter, number> = { Todos: equipamentos.length, Ativo: 0, Manutencao: 0, Estoque: 0, Baixado: 0 };
    for (const e of equipamentos) map[e.status] += 1;
    return map;
  }, [equipamentos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipamentos.filter((e) => {
      if (filter !== 'Todos' && e.status !== filter) return false;
      if (!q) return true;
      return (
        e.serial.toLowerCase().includes(q) ||
        e.modelo.toLowerCase().includes(q) ||
        (e.responsavel?.nome || '').toLowerCase().includes(q) ||
        (e.hostname || '').toLowerCase().includes(q) ||
        e.tipo.nome.toLowerCase().includes(q)
      );
    });
  }, [equipamentos, filter, query]);

  const hasActiveFilter = filter !== 'Todos' || query.trim().length > 0;

  return (
    <View style={styles.screen}>
      <Header title="Inventário" />
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar serial, modelo, usuário…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        <Pressable style={styles.searchIconBtn} onPress={() => navigation.navigate('BuscaAvancada')}>
          <Feather name="sliders" size={16} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.chipsWrap}>
        {FILTERS.map((item) => (
          <Chip
            key={item}
            label={FILTER_LABEL[item]}
            count={counts[item]}
            active={filter === item}
            onPress={() => setFilter(item)}
          />
        ))}
      </View>

      <View style={styles.counterRow}>
        <Text style={styles.counterText}>{filtered.length} EQUIPAMENTOS</Text>
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
        renderItem={({ item }) => (
          <EquipCard item={item} onPress={() => navigation.navigate('Detalhe', { id: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nada encontrado.</Text>
          </View>
        }
      />
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
  searchIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceFrom,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // chips quebram linha em vez de rolar na horizontal — nenhum filtro fica
  // cortado na borda da tela
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
