import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FormField } from '../components/FormField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { getDefaultApiUrl } from '../api/client';

export function LoginScreen() {
  const { login, serverUrl, updateServerUrl } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerField, setShowServerField] = useState(false);
  const [serverInput, setServerInput] = useState(serverUrl);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), senha);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveServer() {
    await updateServerUrl(serverInput);
    setShowServerField(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.company}>USINA CAÇU</Text>
          <Text style={styles.product}>Inventário TI</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FormField
          label="E-mail"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="nome@usinacacu.com.br"
          value={email}
          onChangeText={setEmail}
        />
        <FormField
          label="Senha"
          secureTextEntry
          placeholder="••••••••"
          value={senha}
          onChangeText={setSenha}
        />

        <Pressable
          style={[styles.primaryBtn, (loading || !email || !senha) && { opacity: 0.6 }]}
          disabled={loading || !email || !senha}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryText}>{loading ? 'Entrando…' : 'Entrar'}</Text>
        </Pressable>

        <Pressable style={styles.serverToggle} onPress={() => setShowServerField((v) => !v)}>
          <Feather name="server" size={13} color={colors.textMuted} />
          <Text style={styles.serverToggleText}>Servidor: {serverUrl}</Text>
        </Pressable>

        {showServerField && (
          <View style={styles.serverBox}>
            <FormField
              label="Endereço da API"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={getDefaultApiUrl()}
              value={serverInput}
              onChangeText={setServerInput}
            />
            <Pressable style={styles.secondaryBtn} onPress={handleSaveServer}>
              <Text style={styles.secondaryText}>Salvar endereço</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl * 1.5,
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
  errorBox: {
    backgroundColor: 'rgba(217,92,74,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217,92,74,0.35)',
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.danger,
  },
  primaryBtn: {
    height: touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#06210b',
  },
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  serverToggleText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
  serverBox: {
    marginTop: spacing.md,
  },
  secondaryBtn: {
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
});
