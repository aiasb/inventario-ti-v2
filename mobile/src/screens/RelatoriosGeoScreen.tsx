import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { StatusBadge } from '../components/StatusBadge';
import { colors, withAlpha } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import { qs } from '../api/client';
import { baixarRelatorioPdf, compartilharCsv } from '../utils/relatoriosExport';
import { ManutencaoRadio, Radio, StatusManutencao, statusManutencaoLabel } from '../types/models';

type Tab = 'radios' | 'os';

function emptyFiltros() {
  return { frotaId: '', id: '', serial: '', dataInicio: '', dataFim: '' };
}

function statusManutencaoColor(status: StatusManutencao): string {
  if (status === 'Concluida') return colors.accent;
  if (status === 'Em andamento') return colors.statusEstoque;
  return colors.statusManutencao;
}

function StatusOsBadge({ status }: { status: StatusManutencao }) {
  const color = statusManutencaoColor(status);
  return (
    <View style={[badgeStyles.badge, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) }]}>
      <Text style={[badgeStyles.text, { color }]}>{statusManutencaoLabel(status)}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    fontFamily: fonts.monoMedium,
    fontSize: 10.5,
  },
});

function vinculoLabel(m: ManutencaoRadio): string {
  if (m.radio) return m.radio.numeroSerie;
  if (m.frota) return `Frota ${m.frota.numero} · ${m.frota.nome}`;
  return '—';
}

function dentroDoPeriodo(dataIso: string | null, inicio: string, fim: string): boolean {
  if (!dataIso) return !inicio && !fim;
  const data = dataIso.slice(0, 10);
  if (inicio && data < inicio) return false;
  if (fim && data > fim) return false;
  return true;
}

export function RelatoriosGeoScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { radios, manutencoesRadios, frotas } = useAppData();
  const [tab, setTab] = useState<Tab>('radios');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtros, setFiltros] = useState(emptyFiltros());
  const [exportando, setExportando] = useState(false);

  const frotaOptions = ['Todas', ...frotas.map((f) => `${f.numero} · ${f.nome}`)];
  const frotaSelecionada = filtros.frotaId ? frotas.find((f) => String(f.id) === filtros.frotaId) : undefined;
  const frotaSelecionadaLabel = frotaSelecionada ? `${frotaSelecionada.numero} · ${frotaSelecionada.nome}` : 'Todas';

  function setFrotaPorLabel(label: string) {
    if (label === 'Todas') {
      setFiltros((f) => ({ ...f, frotaId: '' }));
      return;
    }
    const frota = frotas.find((fr) => `${fr.numero} · ${fr.nome}` === label);
    setFiltros((f) => ({ ...f, frotaId: frota ? String(frota.id) : '' }));
  }

  const radiosFiltrados = useMemo(() => {
    const idQuery = filtros.id.trim().toLowerCase();
    const serialQuery = filtros.serial.trim().toLowerCase();
    return radios.filter((r: Radio) => {
      if (filtros.frotaId && String(r.frota?.id || '') !== filtros.frotaId) return false;
      if (idQuery && !(r.idDigital || '').toLowerCase().includes(idQuery) && !(r.idAnalogico || '').toLowerCase().includes(idQuery)) return false;
      if (serialQuery && !r.numeroSerie.toLowerCase().includes(serialQuery)) return false;
      if (!dentroDoPeriodo(r.dataAquisicao, filtros.dataInicio, filtros.dataFim)) return false;
      return true;
    });
  }, [radios, filtros]);

  const osFiltradas = useMemo(() => {
    const idQuery = filtros.id.trim().toLowerCase();
    const serialQuery = filtros.serial.trim().toLowerCase();
    return manutencoesRadios.filter((m: ManutencaoRadio) => {
      const radioVinculado = m.radio ? radios.find((r) => r.id === m.radio!.id) : undefined;
      const frotaId = m.frota?.id ?? radioVinculado?.frota?.id;
      if (filtros.frotaId && String(frotaId ?? '') !== filtros.frotaId) return false;
      const idDigital = radioVinculado?.idDigital || '';
      const idAnalogico = radioVinculado?.idAnalogico || '';
      if (idQuery && !idDigital.toLowerCase().includes(idQuery) && !idAnalogico.toLowerCase().includes(idQuery)) return false;
      if (serialQuery && !(m.radio?.numeroSerie || '').toLowerCase().includes(serialQuery)) return false;
      if (!dentroDoPeriodo(m.data, filtros.dataInicio, filtros.dataFim)) return false;
      return true;
    });
  }, [manutencoesRadios, radios, filtros]);

  const hasFiltrosAtivos = Object.values(filtros).some((v) => v);

  async function exportarCsv() {
    try {
      if (tab === 'radios') {
        if (radiosFiltrados.length === 0) {
          showToast('Nenhum registro para exportar.');
          return;
        }
        const header = ['Nº Série', 'Modelo', 'ID Digital', 'ID Analógico', 'Frota', 'Área', 'Responsável', 'Status', 'Aquisição'];
        const rows = radiosFiltrados.map((r) => [
          r.numeroSerie, r.modelo || '', r.idDigital || '', r.idAnalogico || '',
          r.frota ? `${r.frota.numero} - ${r.frota.nome}` : '', r.area?.nome || '', r.responsavel?.nome || '',
          r.status, formatDate(r.dataAquisicao),
        ]);
        await compartilharCsv('relatorio-radios.csv', header, rows, 'Relatório de Rádios');
      } else {
        if (osFiltradas.length === 0) {
          showToast('Nenhum registro para exportar.');
          return;
        }
        const header = ['OS', 'Rádio/Frota', 'Defeito', 'Tipo', 'Técnico', 'Data', 'Status', 'Insumos'];
        const rows = osFiltradas.map((m) => [
          m.os, vinculoLabel(m), m.titulo, m.tipo, m.tecnico || '', formatDate(m.data), m.status,
          m.insumos.map((i) => i.nome).join(', '),
        ]);
        await compartilharCsv('relatorio-manutencoes-radios.csv', header, rows, 'Relatório de Manutenções');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao exportar CSV.');
    }
  }

  async function exportarPdf() {
    setExportando(true);
    try {
      const params = { frotaId: filtros.frotaId, id: filtros.id, dataInicio: filtros.dataInicio, dataFim: filtros.dataFim };
      if (tab === 'radios') {
        await baixarRelatorioPdf(
          `/radios/export/pdf${qs({ ...params, numeroSerie: filtros.serial })}`,
          'relatorio-radios.pdf',
          'Relatório de Rádios'
        );
      } else {
        await baixarRelatorioPdf(
          `/manutencoes-radios/export/pdf${qs({ ...params, serial: filtros.serial })}`,
          'relatorio-manutencoes-radios.pdf',
          'Relatório de Manutenções'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao gerar PDF.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Relatórios</Text>
      </View>

      <View style={styles.tabsRow}>
        <Pressable style={[styles.tabBtn, tab === 'radios' && styles.tabBtnActive]} onPress={() => setTab('radios')}>
          <Text style={[styles.tabText, tab === 'radios' && styles.tabTextActive]}>Rádios</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'os' && styles.tabBtnActive]} onPress={() => setTab('os')}>
          <Text style={[styles.tabText, tab === 'os' && styles.tabTextActive]}>Manutenções</Text>
        </Pressable>
      </View>

      <Pressable style={styles.filtrosToggle} onPress={() => setFiltrosAbertos((v) => !v)}>
        <Feather name="filter" size={14} color={colors.textSecondary} />
        <Text style={styles.filtrosToggleText}>
          Filtros{hasFiltrosAtivos ? ' (ativos)' : ''}
        </Text>
        <Feather name={filtrosAbertos ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {filtrosAbertos && (
        <View style={styles.filtrosBox}>
          <SelectField label="Frota" value={frotaSelecionadaLabel} options={frotaOptions} onChange={setFrotaPorLabel} />
          <FormField label="ID (Digital/Analógico)" placeholder="Ex.: DMR-4471" value={filtros.id} onChangeText={(v) => setFiltros((f) => ({ ...f, id: v }))} />
          <FormField label="Nº de Série" placeholder="Ex.: RD-45821" value={filtros.serial} onChangeText={(v) => setFiltros((f) => ({ ...f, serial: v }))} />
          <View style={styles.periodoRow}>
            <View style={{ flex: 1 }}>
              <FormField label="Período - início" placeholder="AAAA-MM-DD" value={filtros.dataInicio} onChangeText={(v) => setFiltros((f) => ({ ...f, dataInicio: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Período - fim" placeholder="AAAA-MM-DD" value={filtros.dataFim} onChangeText={(v) => setFiltros((f) => ({ ...f, dataFim: v }))} />
            </View>
          </View>
          {hasFiltrosAtivos && (
            <Pressable style={styles.limparBtn} onPress={() => setFiltros(emptyFiltros())}>
              <Text style={styles.limparText}>✕ Limpar filtros</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {tab === 'radios' ? `${radiosFiltrados.length} RÁDIO(S)` : `${osFiltradas.length} OS`}
        </Text>
        <View style={styles.exportActions}>
          <Pressable style={styles.exportBtn} onPress={exportarCsv}>
            <Feather name="download" size={13} color={colors.text} />
            <Text style={styles.exportBtnText}>CSV</Text>
          </Pressable>
          <Pressable style={[styles.exportBtn, styles.exportBtnPrimary]} onPress={exportarPdf} disabled={exportando}>
            {exportando ? (
              <ActivityIndicator size="small" color="#06210b" />
            ) : (
              <>
                <Feather name="printer" size={13} color="#06210b" />
                <Text style={[styles.exportBtnText, styles.exportBtnTextPrimary]}>PDF</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {tab === 'radios' ? (
        <FlatList
          data={radiosFiltrados}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowOs}>{item.numeroSerie}</Text>
                <StatusBadge status={item.status} size="sm" />
              </View>
              <Text style={styles.rowSubtitle} numberOfLines={1}>{item.modelo || 'sem modelo'}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.frota ? `${item.frota.numero} · ${item.frota.nome}` : 'sem frota'} · {item.idDigital || '—'} / {item.idAnalogico || '—'}
              </Text>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Nenhum rádio encontrado.</Text></View>}
        />
      ) : (
        <FlatList
          data={osFiltradas}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rowOs}>{item.os}</Text>
                <StatusOsBadge status={item.status} />
              </View>
              <Text style={styles.rowSubtitle} numberOfLines={1}>{item.titulo}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {vinculoLabel(item)} · {formatDate(item.data)}
              </Text>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Nenhuma OS encontrada.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fonts.titleSemiBold,
    fontSize: 18,
    color: colors.text,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(87,178,94,0.12)',
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accent,
  },
  filtrosToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  filtrosToggleText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  filtrosBox: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  periodoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  limparBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  limparText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.danger,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  counterText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportBtnPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  exportBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.text,
  },
  exportBtnTextPrimary: {
    color: '#06210b',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceFrom,
    marginBottom: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowOs: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.accent,
  },
  rowSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
