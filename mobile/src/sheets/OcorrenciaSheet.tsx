import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '../components/BottomSheet';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { RadioPickerField } from '../components/RadioPickerField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useToast } from '../context/ToastContext';
import { repository } from '../data/repository';
import { Ocorrencia, ocorrenciaLocked, Radio, Transportadora, FornecedorGeo } from '../types/models';

interface ItemForm {
  radio: Radio | null;
  numeroOs: string;
  solicitante: string;
}

function emptyItem(): ItemForm {
  return { radio: null, numeroOs: '', solicitante: '' };
}

export function OcorrenciaSheet({
  visible,
  onClose,
  ocorrencia,
  radios,
  transportadoras,
  fornecedores,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  ocorrencia: Ocorrencia | null;
  radios: Radio[];
  transportadoras: Transportadora[];
  fornecedores: FornecedorGeo[];
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [transportadoraLabel, setTransportadoraLabel] = useState('Nenhuma');
  const [fornecedorLabel, setFornecedorLabel] = useState('Nenhum');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const locked = ocorrencia ? ocorrenciaLocked(ocorrencia.status) : false;
  const transportadoraOptions = ['Nenhuma', ...transportadoras.map((t) => t.nome)];
  const fornecedorOptions = ['Nenhum', ...fornecedores.map((f) => f.nome)];

  useEffect(() => {
    if (!visible) return;
    if (ocorrencia) {
      setTransportadoraLabel(ocorrencia.transportadora?.nome || 'Nenhuma');
      setFornecedorLabel(ocorrencia.fornecedor?.nome || 'Nenhum');
      setNotaFiscal(ocorrencia.notaFiscal || '');
      setObservacoes(ocorrencia.observacoes || '');
      setItens(
        ocorrencia.itens.length
          ? ocorrencia.itens.map((i) => ({
              radio: radios.find((r) => r.id === i.radioId) || null,
              numeroOs: i.numeroOs || '',
              solicitante: i.solicitante || '',
            }))
          : [emptyItem()]
      );
    } else {
      setTransportadoraLabel('Nenhuma');
      setFornecedorLabel('Nenhum');
      setNotaFiscal('');
      setObservacoes('');
      setItens([emptyItem()]);
    }
  }, [visible, ocorrencia, radios]);

  function updateItem(idx: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItens((prev) => [...prev, emptyItem()]);
  }
  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    const itensValidos = itens.filter((it) => it.radio);
    if (itensValidos.length === 0) {
      showToast('Vincule ao menos um rádio à ocorrência.');
      return;
    }
    setSaving(true);
    try {
      const transportadora = transportadoras.find((t) => t.nome === transportadoraLabel);
      const fornecedor = fornecedores.find((f) => f.nome === fornecedorLabel);
      const payload = {
        transportadoraId: transportadora?.id ?? null,
        fornecedorId: fornecedor?.id ?? null,
        notaFiscal: notaFiscal.trim() || null,
        observacoes: observacoes.trim() || null,
        itens: itensValidos.map((it) => ({
          radioId: it.radio!.id,
          numeroOs: it.numeroOs.trim() || null,
          solicitante: it.solicitante.trim() || null,
        })),
      };
      if (ocorrencia) {
        await repository.updateOcorrencia(ocorrencia.id, payload);
        showToast('Ocorrência atualizada.');
      } else {
        await repository.createOcorrencia(payload);
        showToast('Ocorrência criada.');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={0.88}>
      <Text style={styles.title}>
        {ocorrencia ? `Ocorrência ${ocorrencia.numero}${locked ? ' (somente leitura)' : ''}` : 'Nova Ocorrência'}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View pointerEvents={locked ? 'none' : 'auto'} style={locked ? { opacity: 0.55 } : undefined}>
          <SelectField label="Transportadora" value={transportadoraLabel} options={transportadoraOptions} onChange={setTransportadoraLabel} />
          <SelectField label="Fornecedor" value={fornecedorLabel} options={fornecedorOptions} onChange={setFornecedorLabel} />
          <FormField label="Nota Fiscal" value={notaFiscal} onChangeText={setNotaFiscal} />
          <FormField label="Observações" value={observacoes} onChangeText={setObservacoes} multiline numberOfLines={3} />

          <Text style={styles.sectionTitle}>Ativos vinculados</Text>
          {itens.map((item, idx) => (
            <View key={idx} style={styles.itemBox}>
              <RadioPickerField label="Rádio" required value={item.radio} radios={radios} onChange={(r) => updateItem(idx, { radio: r })} />
              <FormField label="Nº OS/Solicitação" value={item.numeroOs} onChangeText={(v) => updateItem(idx, { numeroOs: v })} />
              <FormField label="Solicitante" value={item.solicitante} onChangeText={(v) => updateItem(idx, { solicitante: v })} />
              {itens.length > 1 && (
                <Pressable style={styles.removeItemBtn} onPress={() => removeItem(idx)}>
                  <Feather name="trash-2" size={13} color={colors.danger} />
                  <Text style={styles.removeItemText}>Remover item</Text>
                </Pressable>
              )}
            </View>
          ))}
          <Pressable style={styles.addItemBtn} onPress={addItem}>
            <Feather name="plus" size={14} color={colors.accent} />
            <Text style={styles.addItemText}>Adicionar item</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>{locked ? 'Fechar' : 'Cancelar'}</Text>
        </Pressable>
        {!locked && (
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Salvando…' : 'Salvar'}</Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemBox: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  removeItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  removeItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.danger,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  addItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    height: touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#06210b',
  },
});
