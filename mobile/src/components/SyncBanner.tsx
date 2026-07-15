import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { useSyncState } from '../offline/syncEngine';

/** Fita discreta mostrada logo abaixo do cabeçalho quando há operações
 * (equipamentos, OSs, termos) feitas offline aguardando envio ao servidor. */
export function SyncBanner({ onPress }: { onPress: () => void }) {
  const { syncing, pendingCount, blockedItems } = useSyncState();
  if (pendingCount === 0) return null;

  const hasBlocked = blockedItems.length > 0;
  const color = hasBlocked ? colors.danger : colors.statusManutencao;
  const icon = hasBlocked ? 'alert-circle' : syncing ? 'refresh-cw' : 'cloud-off';
  const label = hasBlocked
    ? `${blockedItems.length} pendência${blockedItems.length > 1 ? 's' : ''} precisa${blockedItems.length > 1 ? 'm' : ''} de atenção`
    : syncing
    ? 'Sincronizando alterações…'
    : `${pendingCount} pendente${pendingCount > 1 ? 's' : ''} de sincronização`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.wrap, { backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.3) }]}
    >
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
      <Feather name="chevron-right" size={14} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});
