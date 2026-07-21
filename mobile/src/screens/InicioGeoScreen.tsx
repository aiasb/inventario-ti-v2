import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Header } from '../components/Header';
import { SectionCard } from '../components/SectionCard';
import { KpiCard } from '../components/KpiCard';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { formatDate } from '../utils/format';
import { statusManutencaoLabel } from '../types/models';
import { RootStackParamList, TabParamListGeo } from '../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamListGeo, 'InicioGeo'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function InicioGeoScreen() {
  const navigation = useNavigation<Nav>();
  const { radios, manutencoesRadios, ready } = useAppData();
  const { refreshing, onRefresh } = useRefreshControl();

  const emManutencao = radios.filter((r) => r.status === 'Manutencao').length;
  const osAbertas = manutencoesRadios.filter((m) => m.status !== 'Concluida').length;
  const semResponsavel = radios.filter((r) => !r.responsavel).slice(0, 6);
  const osRecentes = manutencoesRadios.slice(0, 8);

  if (!ready) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.screen}>
      <Header title="Visão geral · Geotecnologia" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <View style={styles.kpiRow}>
          <KpiCard
            icon="radio"
            iconColor={colors.accent}
            value={radios.length}
            label="Rádios"
            onPress={() => navigation.navigate('RadiosTab')}
          />
          <KpiCard
            icon="tool"
            iconColor={colors.statusManutencao}
            value={emManutencao}
            label="Manutenção"
            onPress={() => navigation.navigate('RadiosTab')}
          />
          <KpiCard
            icon="clipboard"
            iconColor={colors.statusEstoque}
            value={osAbertas}
            label="OS abertas"
            onPress={() => navigation.navigate('ManutencoesRadiosTab')}
          />
        </View>

        <SectionCard
          title="Rádios sem responsável"
          right={
            semResponsavel.length > 0 ? (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{semResponsavel.length}</Text>
              </View>
            ) : undefined
          }
          style={{ marginBottom: spacing.lg }}
        >
          {semResponsavel.length === 0 && (
            <Text style={styles.emptyText}>Todos os rádios têm um responsável definido.</Text>
          )}
          {semResponsavel.map((r, idx) => (
            <Pressable
              key={r.id}
              style={[styles.row, idx < semResponsavel.length - 1 && styles.divider]}
              onPress={() => navigation.navigate('DetalheRadio', { id: r.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{r.numeroSerie}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>{r.modelo || 'sem modelo'}</Text>
              </View>
            </Pressable>
          ))}
        </SectionCard>

        <SectionCard title="Ordens de serviço recentes">
          {osRecentes.length === 0 && <Text style={styles.emptyText}>Nenhuma OS registrada ainda.</Text>}
          {osRecentes.map((m, idx) => (
            <Pressable
              key={m.id}
              style={[styles.row, idx < osRecentes.length - 1 && styles.divider]}
              disabled={!m.radio}
              onPress={() => m.radio && navigation.navigate('DetalheRadio', { id: m.radio.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.osNum}>{m.os}</Text>
                <Text style={styles.rowTitle} numberOfLines={1}>{m.titulo}</Text>
                <Text style={styles.rowSubtitle}>
                  {m.radio ? m.radio.numeroSerie : m.frota ? `Frota ${m.frota.numero}` : '—'} · {formatDate(m.data)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: withAlpha(m.status === 'Concluida' ? colors.accent : colors.statusManutencao, 0.14) },
                ]}
              >
                <Text style={[styles.statusText, { color: m.status === 'Concluida' ? colors.accent : colors.statusManutencao }]}>
                  {statusManutencaoLabel(m.status)}
                </Text>
              </View>
            </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    gap: spacing.sm,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
  },
  rowSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  osNum: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
  },
});
