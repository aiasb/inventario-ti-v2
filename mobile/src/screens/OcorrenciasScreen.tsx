import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { repository } from '../data/repository';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { formatDate } from '../utils/format';
import {
  Ocorrencia,
  ocorrenciaLocked,
  STATUS_OCORRENCIA,
  StatusOcorrencia,
  statusOcorrenciaLabel,
  Transportadora,
  FornecedorGeo,
} from '../types/models';
import { OcorrenciaSheet } from '../sheets/OcorrenciaSheet';

function statusColor(status: StatusOcorrencia): string {
  switch (status) {
    case 'Finalizado':
      return colors.accent;
    case 'Recusado':
      return colors.danger;
    case 'Enviado':
      return colors.statusEstoque;
    case 'Em Analise':
      return colors.statusManutencao;
    default:
      return colors.textSecondary;
  }
}

export function OcorrenciasScreen() {
  const insets = useSafeAreaInsets();
  const { radios } = useAppData();
  const { podeCriar } = useAuth();
  const { showToast } = useToast();

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorGeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState<StatusOcorrencia | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<Ocorrencia | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ocs, transp, forn] = await Promise.all([
        repository.listOcorrencias(),
        repository.listTransportadoras(),
        repository.listFornecedoresGeo(),
      ]);
      setOcorrencias(ocs);
      setTransportadoras(transp);
      setFornecedores(forn);
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível carregar as ocorrências.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const contadores = useMemo(() => {
    const map = STATUS_OCORRENCIA.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<StatusOcorrencia, number>);
    for (const o of ocorrencias) map[o.status] += 1;
    return map;
  }, [ocorrencias]);

  const filtradas = statusFiltro ? ocorrencias.filter((o) => o.status === statusFiltro) : ocorrencias;

  function openNew() {
    setEditing(null);
    setSheetVisible(true);
  }
  function openView(o: Ocorrencia) {
    setEditing(o);
    setSheetVisible(true);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Ocorrências</Text>
        {podeCriar('ocorrencias') && (
          <Pressable style={styles.addBtn} onPress={openNew}>
            <Feather name="plus" size={18} color="#06210b" />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
        {STATUS_OCORRENCIA.map((s) => {
          const active = statusFiltro === s;
          const color = statusColor(s);
          return (
            <Pressable
              key={s}
              style={[styles.chip, { borderColor: active ? color : colors.border, backgroundColor: active ? withAlpha(color, 0.14) : colors.surfaceFrom }]}
              onPress={() => setStatusFiltro(active ? null : s)}
            >
              <Text style={[styles.chipLabel, { color: active ? color : colors.textSecondary }]}>{statusOcorrenciaLabel(s)}</Text>
              <Text style={[styles.chipCount, { color: active ? color : colors.text }]}>{contadores[s] || 0}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtradas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => {
          const color = statusColor(item.status);
          return (
            <Pressable style={styles.row} onPress={() => openView(item)}>
              <View style={styles.rowTop}>
                <Text style={styles.rowNumero}>{item.numero}</Text>
                <View style={[styles.statusBadge, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) }]}>
                  <Text style={[styles.statusText, { color }]}>{statusOcorrenciaLabel(item.status)}</Text>
                </View>
              </View>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.transportadora?.nome || 'sem transportadora'} · {item.fornecedor?.nome || 'sem fornecedor'}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.itens.length} item(ns) · {formatDate(item.data)}
                {ocorrenciaLocked(item.status) ? ' · somente leitura' : ''}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={22} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhuma ocorrência encontrada.</Text>
            </View>
          ) : null
        }
      />

      <OcorrenciaSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        ocorrencia={editing}
        radios={radios}
        transportadoras={transportadoras}
        fornecedores={fornecedores}
        onSaved={load}
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
  headerTitle: {
    flex: 1,
    fontFamily: fonts.titleSemiBold,
    fontSize: 18,
    color: colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  chipsRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  chipCount: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
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
    marginBottom: 6,
  },
  rowNumero: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
  },
  rowSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
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
