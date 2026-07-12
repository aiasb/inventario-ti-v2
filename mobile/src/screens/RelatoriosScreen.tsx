import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Header } from '../components/Header';
import { SectionCard } from '../components/SectionCard';
import { BarRow } from '../components/BarRow';
import { ColumnChart, ColumnDatum } from '../components/ColumnChart';
import { colors, statusColor } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { ageInYears, formatAge } from '../utils/format';
import { STATUS_EQUIPAMENTO, statusLabel } from '../types/models';
import { TabParamList } from '../navigation/types';

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function RelatoriosScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { equipamentos, manutencoes, setores } = useAppData();

  const porStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const status of STATUS_EQUIPAMENTO) map[status] = 0;
    for (const e of equipamentos) map[e.status] += 1;
    return STATUS_EQUIPAMENTO.map((status) => ({ status, count: map[status] }));
  }, [equipamentos]);

  const porSetor = useMemo(() => {
    const nomes = setores.map((s) => s.nome);
    const map: Record<string, number> = {};
    for (const nome of nomes) map[nome] = 0;
    for (const e of equipamentos) {
      const nome = e.setor?.nome || 'Sem setor';
      map[nome] = (map[nome] || 0) + 1;
    }
    return Object.entries(map)
      .map(([setor, count]) => ({ setor, count }))
      .sort((a, b) => b.count - a.count);
  }, [equipamentos, setores]);

  const maxSetor = Math.max(...porSetor.map((s) => s.count), 1);
  const maxStatus = Math.max(...porStatus.map((s) => s.count), 1);

  const idadeMedia = useMemo(() => {
    const idades = equipamentos.map((e) => ageInYears(e.dataAquisicao)).filter((y): y is number => y !== null);
    if (idades.length === 0) return null;
    return idades.reduce((a, b) => a + b, 0) / idades.length;
  }, [equipamentos]);

  const idadePorSetor = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const e of equipamentos) {
      const anos = ageInYears(e.dataAquisicao);
      if (anos === null) continue;
      const nome = e.setor?.nome || 'Sem setor';
      if (!map.has(nome)) map.set(nome, []);
      map.get(nome)!.push(anos);
    }
    return [...map.entries()]
      .map(([setor, valores]) => ({ setor, anos: valores.reduce((a, b) => a + b, 0) / valores.length }))
      .sort((a, b) => b.anos - a.anos);
  }, [equipamentos]);

  const maxIdadeSetor = Math.max(...idadePorSetor.map((s) => s.anos), 1);

  const manutencoesPorMes: ColumnDatum[] = useMemo(() => {
    const now = new Date();
    const buckets: ColumnDatum[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: MONTH_LABELS[d.getMonth()], corretiva: 0, preventiva: 0 });
    }
    for (const m of manutencoes) {
      const d = new Date(m.data);
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo < 0 || monthsAgo > 5) continue;
      const bucket = buckets[5 - monthsAgo];
      if (m.tipo === 'Corretiva') bucket.corretiva += 1;
      else bucket.preventiva += 1;
    }
    return buckets;
  }, [manutencoes]);

  return (
    <View style={styles.screen}>
      <Header title="Relatórios" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionCard style={{ marginBottom: spacing.lg }}>
          <Text style={styles.valorLabel}>TOTAL DO PARQUE</Text>
          <View style={styles.valorRow}>
            <Text style={styles.valorValue}>{equipamentos.length}</Text>
            <Text style={styles.valorCount}>ITENS CADASTRADOS</Text>
          </View>
          <View style={styles.idadeRow}>
            <Text style={styles.idadeLabel}>Idade média do parque</Text>
            <Text style={styles.idadeValue}>{formatAge(idadeMedia)}</Text>
          </View>
        </SectionCard>

        <SectionCard title="Status do parque" style={{ marginBottom: spacing.lg }}>
          {porStatus.map(({ status, count }) => (
            <BarRow
              key={status}
              label={statusLabel(status)}
              count={count}
              max={maxStatus}
              color={statusColor(status)}
              dotColor={statusColor(status)}
              onPress={() => navigation.navigate('Itens', { statusFilter: status })}
            />
          ))}
        </SectionCard>

        <SectionCard title="Distribuição por setor" style={{ marginBottom: spacing.lg }}>
          {porSetor.map(({ setor, count }) => (
            <BarRow key={setor} label={setor} count={count} max={maxSetor} color={colors.accent} />
          ))}
        </SectionCard>

        <SectionCard title="Idade média por setor" style={{ marginBottom: spacing.lg }}>
          {idadePorSetor.map(({ setor, anos }) => (
            <View key={setor} style={styles.ageRow}>
              <Text style={styles.ageLabel} numberOfLines={1}>{setor}</Text>
              <View style={styles.ageTrackWrap}>
                <View style={styles.ageTrack}>
                  <View style={[styles.ageFill, { width: `${Math.max(4, (anos / maxIdadeSetor) * 100)}%` }]} />
                </View>
              </View>
              <Text style={styles.ageValue}>{formatAge(anos)}</Text>
            </View>
          ))}
          {idadePorSetor.length === 0 && <Text style={styles.emptyText}>Sem dados de aquisição suficientes.</Text>}
        </SectionCard>

        <SectionCard title="Manutenções por mês">
          <ColumnChart data={manutencoesPorMes} />
        </SectionCard>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  valorLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: 10,
  },
  valorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  valorValue: {
    fontFamily: fonts.titleBold,
    fontSize: 30,
    color: colors.text,
  },
  valorCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
  },
  idadeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  idadeLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  idadeValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13.5,
    color: colors.accent,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ageLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    width: 92,
  },
  ageTrackWrap: {
    flex: 1,
  },
  ageTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  ageFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  ageValue: {
    fontFamily: fonts.monoMedium,
    fontSize: 11.5,
    color: colors.text,
    width: 62,
    textAlign: 'right',
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
