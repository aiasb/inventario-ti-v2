import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { useEmpresa } from '../context/EmpresaContext';

export function SelecionarEmpresaScreen() {
  const { usuario, logout } = useAuth();
  const { empresas, setEmpresaAtual } = useEmpresa();

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo-cacu.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.company}>USINA CAÇU</Text>
          <Text style={styles.product}>Selecione a empresa</Text>
        </View>

        <Text style={styles.helpText}>
          Olá, {usuario?.nome?.split(' ')[0]}. Você tem acesso a mais de uma empresa — escolha com qual deseja trabalhar agora.
        </Text>

        {empresas.map((e) => (
          <Pressable key={e.id} style={styles.empresaBtn} onPress={() => setEmpresaAtual(e.slug)}>
            <Text style={styles.empresaText}>{e.nome}</Text>
            <Feather name="chevron-right" size={18} color="#06210b" />
          </Pressable>
        ))}

        <Pressable style={styles.logoutBtn} onPress={() => logout()}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  company: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 15,
    color: colors.text,
    letterSpacing: 0.5,
  },
  product: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  helpText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 19,
  },
  empresaBtn: {
    height: touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: spacing.sm,
  },
  empresaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#06210b',
  },
  logoutBtn: {
    height: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  logoutText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
