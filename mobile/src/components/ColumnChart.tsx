import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export interface ColumnDatum {
  label: string;
  corretiva: number;
  preventiva: number;
}

const CHART_HEIGHT = 96;

export function ColumnChart({ data }: { data: ColumnDatum[] }) {
  const max = Math.max(...data.map((d) => Math.max(d.corretiva, d.preventiva)), 1);

  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Corretivas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.statusEstoque }]} />
          <Text style={styles.legendText}>Preventivas</Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        {data.map((d) => (
          <View key={d.label} style={styles.column}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(3, (d.corretiva / max) * CHART_HEIGHT), backgroundColor: colors.accent },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  { height: Math.max(3, (d.preventiva / max) * CHART_HEIGHT), backgroundColor: colors.statusEstoque },
                ]}
              />
            </View>
            <Text style={styles.monthLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 22,
  },
  column: {
    alignItems: 'center',
    flex: 1,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: CHART_HEIGHT,
  },
  bar: {
    width: 8,
    borderRadius: 3,
  },
  monthLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 6,
  },
});
