import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '../components/StatusBadge';
import { WarrantyBar } from '../components/WarrantyBar';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { formatDate, warrantyInfo } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import { NovaOsSheet } from '../sheets/NovaOsSheet';
import { Manutencao, statusManutencaoLabel } from '../types/models';
import { useAuth } from '../context/AuthContext';
import { useSheet } from '../context/SheetContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetalheRoute = RouteProp<RootStackParamList, 'Detalhe'>;

export function DetalheScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetalheRoute>();
  const insets = useSafeAreaInsets();
  const { getEquipamento, getManutencoesDe } = useAppData();
  const { podeCriar, podeEditar } = useAuth();
  const { openEditarEquipamento } = useSheet();
  const { showToast } = useToast();
  const [osSheetVisible, setOsSheetVisible] = useState(false);

  const equipamento = getEquipamento(route.params.id);

  if (!equipamento) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>Equipamento não encontrado.</Text>
      </View>
    );
  }

  const manutencoes = getManutencoesDe(equipamento.id);
  const warranty = warrantyInfo(equipamento.dataAquisicao, equipamento.dataGarantia);

  const fields: { label: string; value: string }[] = [
    { label: 'Tipo', value: equipamento.tipo.nome },
    { label: 'Serial', value: equipamento.serial },
    { label: 'Hostname', value: equipamento.hostname || '—' },
    ...(equipamento.tipo.nome === 'Celular' ? [{ label: 'IMEI', value: equipamento.imei || '—' }] : []),
    { label: 'Responsável', value: equipamento.responsavel?.nome || 'Estoque TI' },
    { label: 'Setor', value: equipamento.setor?.nome || '—' },
    { label: 'Fornecedor', value: equipamento.fornecedor?.nome || '—' },
    { label: 'Aquisição', value: formatDate(equipamento.dataAquisicao) },
    { label: 'Garantia até', value: formatDate(equipamento.dataGarantia) },
    { label: 'Status', value: equipamento.status === 'Manutencao' ? 'Manutenção' : equipamento.status },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.pat}>{equipamento.serial}</Text>
          <Text style={styles.modelo} numberOfLines={1}>{equipamento.modelo}</Text>
        </View>
        {/* wrapper anula o alignSelf:flex-start do badge p/ centralizar com o botão de editar */}
        <View>
          <StatusBadge status={equipamento.status} />
        </View>
        {podeEditar('inventario') && (
          <Pressable style={styles.editBtn} onPress={() => openEditarEquipamento(equipamento)}>
            <Feather name="edit-2" size={16} color={colors.text} />
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

        <View style={styles.warrantySection}>
          <WarrantyBar info={warranty} />
        </View>

        <Text style={styles.sectionTitle}>Histórico de manutenções</Text>
        {manutencoes.length === 0 && (
          <Text style={styles.emptyText}>Nenhuma manutenção registrada para este equipamento.</Text>
        )}
        {manutencoes.map((m: Manutencao) => (
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

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => showToast('Geração de termos chega em breve.')}
        >
          <Text style={styles.secondaryText}>Gerar termo</Text>
        </Pressable>
        {podeCriar('manutencoes') && (
          <Pressable style={styles.primaryBtn} onPress={() => setOsSheetVisible(true)}>
            <Text style={styles.primaryText}>Abrir OS</Text>
          </Pressable>
        )}
      </View>

      <NovaOsSheet visible={osSheetVisible} onClose={() => setOsSheetVisible(false)} equipamento={equipamento} />
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
  pat: {
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
  warrantySection: {
    marginBottom: spacing.xl,
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
  secondaryBtn: {
    flex: 1,
    height: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
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
