import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { EquipamentoPickerField } from '../components/EquipamentoPickerField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing, touchTarget } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { Equipamento } from '../types/models';

const NENHUM = 'Nenhum';

export function NovoTermoSheet({
  visible,
  onClose,
  equipamento,
}: {
  visible: boolean;
  onClose: () => void;
  /** Quando omitido, o usuário escolhe o equipamento na própria sheet. */
  equipamento?: Equipamento | null;
}) {
  const { equipamentos, responsaveis, termoModelos, criarTermo } = useAppData();
  const { showToast } = useToast();
  const [selecionado, setSelecionado] = useState<Equipamento | null>(equipamento ?? null);
  const [colaborador, setColaborador] = useState('');
  const [cargo, setCargo] = useState('');
  const [responsavelNome, setResponsavelNome] = useState(NENHUM);
  const [modeloNome, setModeloNome] = useState(NENHUM);
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const responsavelOptions = useMemo(() => [NENHUM, ...responsaveis.map((r) => r.nome)], [responsaveis]);
  const modeloOptions = useMemo(
    () => [NENHUM, ...termoModelos.filter((m) => m.ativo).map((m) => m.nome)],
    [termoModelos]
  );

  useEffect(() => {
    if (!visible) return;
    setSelecionado(equipamento ?? null);
    setColaborador(equipamento?.responsavel?.nome || '');
    setCargo('');
    setResponsavelNome(NENHUM);
    setModeloNome(NENHUM);
    setObservacoes('');
  }, [visible, equipamento]);

  async function handleSave() {
    if (!selecionado) {
      showToast('Selecione um equipamento.');
      return;
    }
    if (!colaborador.trim()) {
      showToast('Informe o colaborador do termo.');
      return;
    }
    setSaving(true);
    try {
      const responsavel = responsaveis.find((r) => r.nome === responsavelNome);
      const modelo = termoModelos.find((m) => m.nome === modeloNome);
      const termo = await criarTermo({
        equipamentoId: selecionado.id,
        colaborador,
        cargo,
        responsavelId: responsavel?.id ?? null,
        modeloId: modelo?.id ?? null,
        observacoes,
      });
      onClose();
      showToast(`${termo.numero} criado para ${selecionado.serial}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={0.85}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Gerar termo</Text>
        {equipamento && (
          <View style={styles.patBadge}>
            <Text style={styles.patText}>{equipamento.serial}</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!equipamento && (
          <EquipamentoPickerField
            label="Equipamento"
            required
            value={selecionado}
            equipamentos={equipamentos}
            onChange={setSelecionado}
          />
        )}

        <FormField
          label="Colaborador"
          required
          placeholder="Nome de quem vai assinar"
          value={colaborador}
          onChangeText={setColaborador}
        />
        <FormField label="Cargo" placeholder="Ex.: Técnico de manutenção" value={cargo} onChangeText={setCargo} />
        <SelectField label="Responsável" value={responsavelNome} options={responsavelOptions} onChange={setResponsavelNome} />
        <SelectField label="Modelo do termo" value={modeloNome} options={modeloOptions} onChange={setModeloNome} />
        <FormField
          label="Observações"
          placeholder="Opcional"
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top', paddingTop: 10 }}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Salvando…' : 'Gerar termo'}</Text>
        </Pressable>
      </View>
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
  title: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 19,
    color: colors.text,
  },
  patBadge: {
    borderWidth: 1,
    borderColor: 'rgba(87,178,94,0.35)',
    backgroundColor: 'rgba(87,178,94,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  patText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
