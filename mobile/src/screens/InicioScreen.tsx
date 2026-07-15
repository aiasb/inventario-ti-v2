import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { usePreferences } from '../context/PreferencesContext';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { RootStackParamList, TabParamList } from '../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Inicio'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function InicioScreen() {
  const navigation = useNavigation<Nav>();
  const { equipamentos, atividades, garantiasVencendo, ready } = useAppData();
  const { preferences } = usePreferences();
  const { refreshing, onRefresh } = useRefreshControl();

  const alertasGarantiaAtivos = preferences.alertasGarantia;
  const garantiasParaExibir = alertasGarantiaAtivos ? garantiasVencendo : [];
  const emManutencao = equipamentos.filter((e) => e.status === 'Manutencao').length;

  if (!ready) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.screen}>
      <Header title="Visão geral" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
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
            value={garantiasParaExibir.length}
            label="Garantias"
            onPress={() => navigation.navigate('Relatorios')}
          />
        </View>

        <SectionCard
          title="Garantias vencendo"
          right={
            garantiasParaExibir.length > 0 ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{garantiasParaExibir.length} em 120 dias</Text>
              </View>
            ) : undefined
          }
          style={{ marginBottom: spacing.lg }}
        >
          {!alertasGarantiaAtivos && (
            <Text style={styles.emptyText}>Alertas de garantia estão desativados nas Configurações.</Text>
          )}
          {alertasGarantiaAtivos && garantiasParaExibir.length === 0 && (
            <Text style={styles.emptyText}>Nenhuma garantia vencendo nos próximos 120 dias.</Text>
          )}
          {garantiasParaExibir.slice(0, 6).map(({ equipamento, warranty }, idx) => (
            <Pressable
              key={equipamento.id}
              style={[styles.warrantyRow, idx < Math.min(garantiasParaExibir.length, 6) - 1 && styles.divider]}
              onPress={() => navigation.navigate('Detalhe', { id: equipamento.id })}
            >
              <View style={styles.warrantyLeft}>
                <Text style={styles.warrantyPat}>{equipamento.serial}</Text>
                <Text style={styles.warrantyModelo} numberOfLines={1}>{equipamento.modelo}</Text>
              </View>
              <View
                style={[
                  styles.daysBadge,
                  { backgroundColor: warranty.tone === 'expired' ? colors.borderSoft : 'rgba(224,180,92,0.14)' },
                ]}
              >
                <Text style={[styles.daysText, { color: warranty.tone === 'expired' ? colors.textMuted : colors.statusManutencao }]}>
                  {warranty.days}d
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
