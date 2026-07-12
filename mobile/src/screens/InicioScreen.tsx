import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Header } from '../components/Header';
import { SectionCard } from '../components/SectionCard';
import { KpiCard } from '../components/KpiCard';
import { ActivityRow } from '../components/ActivityRow';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { warrantyInfo } from '../utils/format';
import { RootStackParamList, TabParamList } from '../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Inicio'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function InicioScreen() {
  const navigation = useNavigation<Nav>();
  const { equipamentos, atividades, ready } = useAppData();

  const garantiasVencendo = useMemo(() => {
    return equipamentos
      .map((e) => ({ e, w: warrantyInfo(e.dataAquisicao, e.dataGarantia) }))
      .filter(({ w }) => w.days !== null && w.days >= 0 && w.days <= 120)
      .sort((a, b) => (a.w.days ?? 0) - (b.w.days ?? 0));
  }, [equipamentos]);

  const emManutencao = equipamentos.filter((e) => e.status === 'Manutencao').length;

  if (!ready) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.screen}>
      <Header title="Visão geral" notificationCount={garantiasVencendo.length} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.kpiRow}>
          <KpiCard
            icon="server"
            iconColor={colors.accent}
            value={equipamentos.length}
            label="Equipamentos"
            onPress={() => navigation.navigate('Itens', { statusFilter: 'Todos' })}
          />
          <KpiCard
            icon="tool"
            iconColor={colors.statusManutencao}
            value={emManutencao}
            label="Manutenção"
            onPress={() => navigation.navigate('Itens', { statusFilter: 'Manutencao' })}
          />
          <KpiCard
            icon="pie-chart"
            iconColor={colors.statusEstoque}
            value={garantiasVencendo.length}
            label="Garantias"
            onPress={() => navigation.navigate('Relatorios')}
          />
        </View>

        <SectionCard
          title="Garantias vencendo"
          right={
            garantiasVencendo.length > 0 ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{garantiasVencendo.length} em 120 dias</Text>
              </View>
            ) : undefined
          }
          style={{ marginBottom: spacing.lg }}
        >
          {garantiasVencendo.length === 0 && (
            <Text style={styles.emptyText}>Nenhuma garantia vencendo nos próximos 120 dias.</Text>
          )}
          {garantiasVencendo.slice(0, 6).map(({ e, w }, idx) => (
            <Pressable
              key={e.id}
              style={[styles.warrantyRow, idx < Math.min(garantiasVencendo.length, 6) - 1 && styles.divider]}
              onPress={() => navigation.navigate('Detalhe', { id: e.id })}
            >
              <View style={styles.warrantyLeft}>
                <Text style={styles.warrantyPat}>{e.patrimonio}</Text>
                <Text style={styles.warrantyModelo} numberOfLines={1}>{e.modelo}</Text>
              </View>
              <View
                style={[
                  styles.daysBadge,
                  { backgroundColor: w.tone === 'expired' ? colors.borderSoft : 'rgba(224,180,92,0.14)' },
                ]}
              >
                <Text style={[styles.daysText, { color: w.tone === 'expired' ? colors.textMuted : colors.statusManutencao }]}>
                  {w.days}d
                </Text>
              </View>
            </Pressable>
          ))}
        </SectionCard>

        <SectionCard title="Atividade recente">
          {atividades.length === 0 && <Text style={styles.emptyText}>Nenhuma atividade registrada ainda.</Text>}
          {atividades.slice(0, 8).map((a, idx) => (
            <ActivityRow key={a.id} item={a} isLast={idx === Math.min(atividades.length, 8) - 1} />
          ))}
        </SectionCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pill: {
    backgroundColor: 'rgba(224,180,92,0.14)',
    borderColor: 'rgba(224,180,92,0.35)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
    color: colors.statusManutencao,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  warrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  warrantyLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  warrantyPat: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
    marginBottom: 2,
  },
  warrantyModelo: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
  },
  daysBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  daysText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
  },
});
