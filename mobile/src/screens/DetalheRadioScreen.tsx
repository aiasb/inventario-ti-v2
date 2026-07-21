import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '../components/StatusBadge';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useSheet } from '../context/SheetContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import { NovaOsRadioSheet } from '../sheets/NovaOsRadioSheet';
import { ManutencaoRadio, statusManutencaoLabel } from '../types/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetalheRoute = RouteProp<RootStackParamList, 'DetalheRadio'>;

export function DetalheRadioScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetalheRoute>();
  const insets = useSafeAreaInsets();
  const { getRadio, getManutencoesRadioDe, excluirRadio } = useAppData();
  const { podeCriar, podeEditar, podeExcluir } = useAuth();
  const { openEditarRadio } = useSheet();
  const { showToast } = useToast();
  const [osSheetVisible, setOsSheetVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const radio = getRadio(route.params.id);

  if (!radio) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>Rádio não encontrado.</Text>
      </View>
    );
  }

  const manutencoes = getManutencoesRadioDe(radio.id);

  function handleDelete() {
    Alert.alert(
      'Excluir rádio',
      `Excluir ${radio!.numeroSerie}? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await excluirRadio(radio!.id);
              navigation.goBack();
            } catch (err: any) {
              showToast(err?.message || 'Não foi possível excluir o rádio.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  const fields: { label: string; value: string }[] = [
    { label: 'Nº de série', value: radio.numeroSerie },
    { label: 'Modelo', value: radio.modelo || '—' },
    { label: 'ID Digital', value: radio.idDigital || '—' },
    { label: 'ID Analógico', value: radio.idAnalogico || '—' },
    { label: 'Frota', value: radio.frota ? `${radio.frota.numero} · ${radio.frota.nome}` : '—' },
    { label: 'Área', value: radio.area?.nome || '—' },
    { label: 'Responsável', value: radio.responsavel?.nome || '—' },
    { label: 'Aquisição', value: formatDate(radio.dataAquisicao) },
    { label: 'Status', value: radio.status === 'Manutencao' ? 'Manutenção' : radio.status },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.serial}>{radio.numeroSerie}</Text>
          <Text style={styles.modelo} numberOfLines={1}>{radio.modelo || 'Rádio'}</Text>
        </View>
        <View>
          {radio.pendingSync ? (
            <View style={[styles.pendingBadge, { backgroundColor: withAlpha(colors.statusManutencao, 0.14), borderColor: withAlpha(colors.statusManutencao, 0.32) }]}>
              <Feather name="cloud-off" size={12} color={colors.statusManutencao} />
              <Text style={[styles.pendingBadgeText, { color: colors.statusManutencao }]}>Pendente de sincronização</Text>
            </View>
          ) : (
            <StatusBadge status={radio.status} />
          )}
        </View>
        {podeEditar('radios') && (
          <Pressable style={styles.editBtn} onPress={() => openEditarRadio(radio)}>
            <Feather name="edit-2" size={16} color={colors.text} />
          </Pressable>
        )}
        {podeExcluir('radios') && (
          <Pressable style={styles.editBtn} onPress={handleDelete} disabled={deleting}>
            <Feather name="trash-2" size={16} color={colors.danger} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {fields.map((f) => (
            <View key={f.label} style={styles.gridItem}>
              <Text style={styles.fieldLabel}>{f.label.toUpperCase()}</Text>
              <Text style={styles.fieldValue}>{f.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Histórico de manutenções</Text>
        {manutencoes.length === 0 && (
          <Text style={styles.emptyText}>Nenhuma manutenção registrada para este rádio.</Text>
        )}
        {manutencoes.map((m: ManutencaoRadio) => (
          <View key={m.id} style={styles.osRow}>
            <View style={styles.osTop}>
              <Text style={styles.osNum}>{m.os}</Text>
              <View
                style={[
                  styles.osStatusBadge,
                  { backgroundColor: m.status === 'Concluida' ? 'rgba(87,178,94,0.14)' : 'rgba(224,180,92,0.14)' },
                ]}
              >
                <Text
                  style={[
                    styles.osStatusText,
                    { color: m.status === 'Concluida' ? colors.accent : colors.statusManutencao },
                  ]}
                >
                  {statusManutencaoLabel(m.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.osTitulo}>{m.titulo}</Text>
            <Text style={styles.osMeta}>{m.tipo} · {m.tecnico || 'sem técnico'} · {formatDate(m.data)}</Text>
          </View>
        ))}

        <View style={{ height: 140 }} />
      </ScrollView>

      {podeCriar('manutencoesRadios') && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={styles.primaryBtn} onPress={() => setOsSheetVisible(true)}>
            <Text style={styles.primaryText}>Abrir OS</Text>
          </Pressable>
        </View>
      )}

      <NovaOsRadioSheet visible={osSheetVisible} onClose={() => setOsSheetVisible(false)} radio={radio} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  notFound: {
    marginTop: 100,
    textAlign: 'center',
    fontFamily: fonts.bodyRegular,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
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
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pendingBadgeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceFrom,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  serial: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
  },
  modelo: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 17,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
    marginBottom: spacing.lg,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  osRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  osTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  osNum: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
  },
  osStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  osStatusText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
  },
  osTitulo: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
    marginTop: 4,
  },
  osMeta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.bg,
  },
  primaryBtn: {
    flex: 1,
    height: touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#06210b',
  },
});
