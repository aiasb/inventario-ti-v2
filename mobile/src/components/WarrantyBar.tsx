import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { WarrantyInfo } from '../utils/format';

const TONE_COLOR: Record<WarrantyInfo['tone'], string> = {
  ok: colors.accent,
  warning: colors.statusManutencao,
  expired: colors.textMuted,
};

export function WarrantyBar({ info, showLabel = true }: { info: WarrantyInfo; showLabel?: boolean }) {
  return (
    <View>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.caption}>GARANTIA</Text>
          <Text style={[styles.value, { color: TONE_COLOR[info.tone] }]}>{info.label}</Text>
        </View>
      )}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${info.percent}%`, backgroundColor: TONE_COLOR[info.tone] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  caption: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  value: {
    fontFamily: fonts.monoMedium,
    fontSize: 11.5,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
