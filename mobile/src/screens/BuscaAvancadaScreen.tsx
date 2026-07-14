import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { SelectField } from '../components/SelectField';
import { EquipRow } from '../components/EquipRow';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { STATUS_EQUIPAMENTO, StatusEquipamento, statusLabel } from '../types/models';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function BuscaAvancadaScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { equipamentos, setores } = useAppData();

  const [query, setQuery] = useState('');
  const [setor, setSetor] = useState('Todos os setores');
  const [statuses, setStatuses] = useState<StatusEquipamento[]>([]);

  const setorOptions = ['Todos os setores', ...setores.map((s) => s.nome)];

  function toggleStatus(status: StatusEquipamento) {
    setStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipamentos.filter((e) => {
      if (setor !== 'Todos os setores' && e.setor?.nome !== setor) return false;
      if (statuses.length > 0 && !statuses.includes(e.status)) return false;
      if (!q) return true;
      return (
        e.serial.toLowerCase().includes(q) ||
        e.modelo.toLowerCase().includes(q) ||
        (e.responsavel?.nome || '').toLowerCase().includes(q) ||
        (e.hostname || '').toLowerCase().includes(q)
      );
    });
  }, [equipamentos, query, setor, statuses]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Busca avançada</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por serial, modelo, usuário…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <SelectField label="Setor" value={setor} options={setorOptions} onChange={setSetor} />

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipsWrap}>
          {STATUS_EQUIPAMENTO.map((status) => (
            <Chip
              key={status}
              label={statusLabel(status)}
              active={statuses.includes(status)}
              onPress={() => toggleStatus(status)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <EquipRow item={item} onPress={() => navigation.navigate('Detalhe', { id: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={20} color={colors.textMuted} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceFrom,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 18,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
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
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    height: 44,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 50,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
