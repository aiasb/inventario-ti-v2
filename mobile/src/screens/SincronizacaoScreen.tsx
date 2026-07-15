import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { discardItem, retryNow, useSyncState } from '../offline/syncEngine';
import { QueuedOperation, StoredQueueItem } from '../offline/types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function describeOp(op: QueuedOperation): { title: string; subtitle: string } {
  switch (op.kind) {
    case 'criarEquipamento':
      return { title: 'Novo equipamento', subtitle: `${op.input.modelo} · ${op.input.serial}` };
    case 'editarEquipamento':
      return { title: 'Edição de equipamento', subtitle: op.input.serial };
    case 'abrirOs':
      return { title: 'Abertura de OS', subtitle: op.input.titulo };
    case 'criarTermo':
      return { title: 'Novo termo', subtitle: op.input.colaborador };
    case 'alternarAssinaturaTermo':
      return { title: 'Assinatura de termo', subtitle: op.assinado ? 'Marcar como assinado' : 'Marcar como pendente' };
    case 'alternarDevolucaoTermo':
      return { title: 'Devolução de termo', subtitle: op.devolvido ? 'Marcar como devolvido' : 'Desfazer devolução' };
    case 'excluirTermo':
      return { title: 'Exclusão de termo', subtitle: `Termo #${op.termoId}` };
  }
}

export function SincronizacaoScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { syncing, items } = useSyncState();
  const { refresh } = useAppData();
  const { showToast } = useToast();
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryNow();
    } finally {
      setRetrying(false);
    }
  }

  async function handleDiscard(item: StoredQueueItem) {
    setDiscardingId(item.id);
    try {
      await discardItem(item.id);
      await refresh();
      showToast('Pendência descartada.');
    } finally {
      setDiscardingId(null);
    }
  }

  const renderItem = ({ item }: { item: StoredQueueItem }) => {
    const { title, subtitle } = describeOp(item.op);
    const busy = discardingId === item.id;
    return (
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{title}</Text>
          {item.blocked ? (
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(colors.danger, 0.14), borderColor: withAlpha(colors.danger, 0.32) }]}>
              <Text style={[styles.statusText, { color: colors.danger }]}>Erro</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(colors.statusManutencao, 0.14), borderColor: withAlpha(colors.statusManutencao, 0.32) }]}>
              <Text style={[styles.statusText, { color: colors.statusManutencao }]}>Aguardando rede</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        {item.blocked && item.lastError && <Text style={styles.errorText}>{item.lastError}</Text>}
        {item.blocked && (
          <Pressable style={[styles.discardBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => handleDiscard(item)}>
            <Feather name="trash-2" size={13} color={colors.danger} />
            <Text style={styles.discardText}>{busy ? 'Descartando…' : 'Descartar'}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sincronização</Text>
        <Pressable style={[styles.retryBtn, retrying && { opacity: 0.6 }]} disabled={retrying || syncing} onPress={handleRetry}>
          <Feather name="refresh-cw" size={15} color={colors.text} />
        </Pressable>
      </View>

      <Text style={styles.helpText}>
        Ações feitas sem conexão ficam guardadas aqui e são enviadas automaticamente assim que a rede voltar. Itens com
        erro precisam da sua atenção — descarte para corrigir e refazer, ou aguarde uma nova tentativa.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-circle" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nada pendente de sincronização.</Text>
          </View>
        }
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
  retryBtn: {
    width: touchTarget, height: touchTarget, borderRadius: 12, backgroundColor: colors.surfaceFrom,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  helpText: {
    fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18,
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  row: {
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.borderSoft, backgroundColor: colors.surfaceFrom, marginBottom: spacing.sm,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  rowSubtitle: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  statusText: { fontFamily: fonts.monoMedium, fontSize: 10 },
  errorText: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.danger, marginTop: 6 },
  discardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(217,92,74,0.35)', backgroundColor: 'rgba(217,92,74,0.08)',
  },
  discardText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.danger },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
});
