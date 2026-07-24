import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '../components/StatusBadge';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSheet } from '../context/SheetContext';
import { Radio, radioIdExibicao, radioStatusLabel, radioTipoLabel } from '../types/models';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RadiosScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { radios } = useAppData();
  const { podeCriar, podeEditar } = useAuth();
  const { openNovoRadio, openEditarRadio } = useSheet();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return radios;
    return radios.filter(
      (r) =>
        r.numeroSerie.toLowerCase().includes(q) ||
        (r.modelo || '').toLowerCase().includes(q) ||
        (r.responsavel?.nome || '').toLowerCase().includes(q)
    );
  }, [radios, query]);

  function openEdit(item: Radio) {
    openEditarRadio(item);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {navigation.canGoBack() && (
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={20} color={colors.text} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>Rádios</Text>
        {podeCriar('radios') && (
          <Pressable style={styles.addBtn} onPress={openNovoRadio}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar nº de série, modelo, responsável…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Nenhum rádio cadastrado.</Text></View>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('DetalheRadio', { id: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.numeroSerie} · {radioIdExibicao(item)}</Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {radioTipoLabel(item.tipo)} · {item.modelo || 'sem modelo'} · {item.frota ? `${item.frota.numero} · ${item.frota.nome}` : 'sem frota'}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.area?.nome || 'sem área'} · {item.responsavel?.nome || 'sem responsável'}
              </Text>
            </View>
            {item.pendingSync ? (
              <View style={styles.pendingBadge}>
                <Feather name="cloud-off" size={11} color={colors.statusManutencao} />
              </View>
            ) : (
              <StatusBadge status={item.status} label={radioStatusLabel(item.status)} />
            )}
            {podeEditar('radios') && (
              <Pressable style={styles.iconBtn} onPress={() => openEdit(item)}>
                <Feather name="edit-2" size={15} color={colors.textSecondary} />
              </Pressable>
            )}
          </Pressable>
        )}
      />
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
  searchRow: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  searchBox: {
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
  center: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  rowTitle: { fontFamily: fonts.mono, fontSize: 13, color: colors.accent },
  rowSubtitle: { fontFamily: fonts.bodyRegular, fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  pendingBadge: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(224,180,92,0.14)', borderWidth: 1, borderColor: 'rgba(224,180,92,0.32)',
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
