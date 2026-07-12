import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
}

export function FormField({ label, required, error, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        {...inputProps}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    minHeight: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceFrom,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.danger,
    marginTop: 4,
  },
});
