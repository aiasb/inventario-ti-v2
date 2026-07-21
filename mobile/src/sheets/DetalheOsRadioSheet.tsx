import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { formatDate } from '../utils/format';
import { ManutencaoRadio, StatusManutencao, statusManutencaoLabel } from '../types/models';

function statusManutencaoColor(status: StatusManutencao): string {
  if (status === 'Concluida') return colors.accent;
  if (status === 'Em andamento') return colors.statusEstoque;
  return colors.statusManutencao;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      {typeof children === 'string' ? <Text style={styles.valor}>{children}</Text> : children}
    </View>
  );
}

export function DetalheOsRadioSheet({ visible, onClose, item }: { visible: boolean; onClose: () => void; item: ManutencaoRadio | null }) {
  const color = item ? statusManutencaoColor(item.status) : colors.textMuted;

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={0.72}>
      {item && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.os}>{item.os}</Text>
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) }]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>{statusManutencaoLabel(item.status)}</Text>
            </View>
          </View>

          <Campo label={item.radio ? 'Rádio' : 'Frota'}>
            {item.radio ? `${item.radio.numeroSerie}${item.radio.modelo ? ' · ' + item.radio.modelo : ''}` : item.frota ? `${item.frota.numero} · ${item.frota.nome}` : '—'}
          </Campo>

          <Campo label="Defeito informado">{item.titulo}</Campo>

          {item.descricao && <Campo label="Descrição">{item.descricao}</Campo>}

          <Campo label="Tipo">{item.tipo}</Campo>
          <Campo label="Técnico">{item.tecnico || '—'}</Campo>
          <Campo label="Data">{formatDate(item.data)}</Campo>

          <Campo label="Insumos utilizados">
            {item.insumos.length ? item.insumos.map((i) => i.nome).join(', ') : '—'}
          </Campo>
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  os: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 19,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.monoMedium,
    fontSize: 11.5,
  },
  campo: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textMuted,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valor: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
    color: colors.text,
    lineHeight: 20,
  },
});
