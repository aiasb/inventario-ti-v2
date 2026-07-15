import React, { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../components/Header';
import { SectionCard } from '../components/SectionCard';
import { ToggleRow, LinkRow } from '../components/SettingRow';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePreferences } from '../context/PreferencesContext';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { Preferences } from '../data/preferences';
import { requestNotificationPermission } from '../utils/notifications';
import { initials } from '../utils/format';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ConfiguracoesScreen() {
  const navigation = useNavigation<Nav>();
  const { equipamentos } = useAppData();
  const { usuario, serverUrl, logout, podeVer } = useAuth();
  const { showToast } = useToast();
  const { preferences: prefs, updatePreference } = usePreferences();
  const { refreshing, onRefresh } = useRefreshControl();
  const [sobreVisible, setSobreVisible] = useState(false);

  async function updatePref<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    if (key === 'notificacoesPush' && value === true) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        showToast('Permita as notificações nas configurações do Android para ativar.');
        return;
      }
    }
    updatePreference(key, value);
  }

  async function handleExportCsv() {
    const header = ['Tipo', 'Modelo', 'Serial', 'Hostname', 'Responsável', 'Setor', 'Status', 'Garantia'];
    const rows = equipamentos.map((e) => [
      e.tipo.nome, e.modelo, e.serial, e.hostname || '',
      e.responsavel?.nome || 'Estoque TI', e.setor?.nome || '', e.status, e.dataGarantia || '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n');
    try {
      await Share.share({ message: csv, title: 'Inventário TI — Usina Caçu' });
    } catch {
      showToast('Não foi possível exportar o CSV.');
    }
  }

  function handleSairDaConta() {
    Alert.alert('Sair da conta', 'Deseja encerrar a sessão neste dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <Header title="Configurações" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <SectionCard style={{ marginBottom: spacing.lg }}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(usuario?.nome || '')}</Text>
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.profileName}>{usuario?.nome}</Text>
              <Text style={styles.profileRole}>{usuario?.cargo || usuario?.perfil}</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Preferências" style={{ marginBottom: spacing.lg }}>
          <ToggleRow
            title="Notificações push"
            subtitle="OS, garantias e termos pendentes"
            value={prefs.notificacoesPush}
            onValueChange={(v) => updatePref('notificacoesPush', v)}
          />
          <ToggleRow
            title="Alertas de garantia"
            subtitle="Avisar 120 dias antes do vencimento"
            value={prefs.alertasGarantia}
            onValueChange={(v) => updatePref('alertasGarantia', v)}
          />
          <ToggleRow
            title="Modo compacto"
            subtitle="Listas mais densas"
            value={prefs.modoCompacto}
            onValueChange={(v) => updatePref('modoCompacto', v)}
            isLast
          />
        </SectionCard>

        <SectionCard title="Sistema" style={{ marginBottom: spacing.lg }}>
          <LinkRow title="Exportar CSV" value="inventário completo" onPress={handleExportCsv} />
          <LinkRow title="Sobre" value="Inventário TI v2 · mobile" onPress={() => setSobreVisible(true)} isLast />
        </SectionCard>

        {(podeVer('cadastros') || podeVer('responsaveis') || podeVer('acessos')) && (
          <SectionCard title="Administração" style={{ marginBottom: spacing.lg }}>
            {podeVer('cadastros') && (
              <LinkRow title="Cadastros" value="tipos, setores, fornecedores" onPress={() => navigation.navigate('Cadastros')} />
            )}
            {podeVer('responsaveis') && (
              <LinkRow title="Responsáveis" onPress={() => navigation.navigate('Responsaveis')} />
            )}
            {podeVer('acessos') && (
              <LinkRow title="Acessos" value="usuários e perfis" onPress={() => navigation.navigate('Acessos')} isLast />
            )}
          </SectionCard>
        )}

        <Pressable style={styles.logoutBtn} onPress={handleSairDaConta}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>

      <InfoModal visible={sobreVisible} onClose={() => setSobreVisible(false)} title="Sobre">
        <Text style={styles.modalText}>Inventário TI · Usina Caçu{'\n'}Versão 2.0.0 (mobile)</Text>
        <Text style={[styles.modalText, { marginTop: 8, color: colors.textMuted }]}>
          Conectado a {serverUrl}
        </Text>
      </InfoModal>
    </View>
  );
}

function InfoModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceTo,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 16,
    color: colors.accent,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surfaceFrom,
  },
  profileName: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  profileRole: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(217,92,74,0.35)',
    backgroundColor: 'rgba(217,92,74,0.1)',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.danger,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 8, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surfaceFrom,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  modalSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: 6,
  },
  modalText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 20,
  },
});
