import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';

export interface NotificacaoItem {
  id: number;
  serial: string;
  modelo: string;
  dias: number;
}

interface NotificacoesPanelProps {
  visible: boolean;
  onClose: () => void;
  itens: NotificacaoItem[];
  alertasAtivos: boolean;
  onItemPress: (id: number) => void;
}

export function NotificacoesPanel({ visible, onClose, itens, alertasAtivos, onItemPress }: NotificacoesPanelProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Notificações</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {!alertasAtivos ? (
            <Text style={styles.emptyText}>Alertas de garantia estão desativados nas Configurações.</Text>
          ) : itens.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma notificação no momento.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {itens.map((item, idx) => (
                <Pressable
                  key={item.id}
                  style={[styles.row, idx < itens.length - 1 && styles.divider]}
                  onPress={() => {
                    onItemPress(item.id);
                    onClose();
                  }}
                >
                  <View style={styles.iconWrap}>
                    <Feather name="alert-triangle" size={15} color={colors.statusManutencao} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.modelo} ({item.serial})
                    </Text>
                    <Text style={styles.rowSub}>Garantia vence em {item.dias} dias</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 8, 0.65)',
    alignItems: 'flex-end',
    paddingTop: 68,
    paddingRight: spacing.lg,
  },
  card: {
    width: 300,
    maxWidth: '90%',
    backgroundColor: colors.surfaceFrom,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(224,180,92,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  rowSub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
});
