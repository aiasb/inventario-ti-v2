import { useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api, qs } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/format.js';

function emptyFiltros() {
  return { frotaId: '', id: '', serial: '', dataInicio: '', dataFim: '' };
}

function vinculoLabel(m) {
  if (m.radio) return m.radio.numeroSerie;
  if (m.frota) return `Frota ${m.frota.numero} · ${m.frota.nome}`;
  return '—';
}

function downloadCsv(filename, header, rows) {
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FiltrosRelatorio({ filtros, onChange, frotas }) {
  const hasActive = Object.values(filtros).some((v) => v);

  function set(key, value) {
    onChange({ ...filtros, [key]: value });
  }

  return (
    <div className="filters-bar">
      <div className="field">
        <label>Frota</label>
        <select className="input" value={filtros.frotaId} onChange={(e) => set('frotaId', e.target.value)}>
          <option value="">Todas</option>
          {frotas.map((f) => (
            <option key={f.id} value={f.id}>{f.numero} · {f.nome}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>ID (Digital/Analógico)</label>
        <input className="input" value={filtros.id} onChange={(e) => set('id', e.target.value)} placeholder="Ex.: DMR-4471" />
      </div>
      <div className="field">
        <label>Nº de Série</label>
        <input className="input" value={filtros.serial} onChange={(e) => set('serial', e.target.value)} placeholder="Ex.: RD-45821" />
      </div>
      <div className="field">
        <label>Período - início</label>
        <input type="date" className="input" value={filtros.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} />
      </div>
      <div className="field">
        <label>Período - fim</label>
        <input type="date" className="input" value={filtros.dataFim} onChange={(e) => set('dataFim', e.target.value)} />
      </div>
      {hasActive && (
        <button className="btn btn-ghost btn-sm" onClick={() => onChange(emptyFiltros())} style={{ alignSelf: 'flex-end' }}>
          <Icon name="x" size={13} />
          Limpar filtros
        </button>
      )}
    </div>
  );
}

export function RelatoriosGeo() {
  const { toast } = useToast();
  const [tab, setTab] = useState('radios');
  const [filtrosRadios, setFiltrosRadios] = useState(emptyFiltros());
  const [filtrosOs, setFiltrosOs] = useState(emptyFiltros());
  const [exportingPdf, setExportingPdf] = useState(false);

  const frotas = useLookup('/frotas');

  const radiosParams = {
    frotaId: filtrosRadios.frotaId, id: filtrosRadios.id, numeroSerie: filtrosRadios.serial,
    dataInicio: filtrosRadios.dataInicio, dataFim: filtrosRadios.dataFim,
  };
  const { data: radiosData, loading: loadingRadios } = useFetch('/radios', { ...radiosParams, limit: 200 });
  const radios = radiosData?.data || [];

  const { data: osData, loading: loadingOs } = useFetch(
    '/manutencoes-radios',
    { frotaId: filtrosOs.frotaId, id: filtrosOs.id, serial: filtrosOs.serial, dataInicio: filtrosOs.dataInicio, dataFim: filtrosOs.dataFim, limit: 200 }
  );
  const os = osData?.data || [];

  usePageHeader({
    breadcrumb: 'Geotecnologia / Relatórios',
    title: 'Relatórios',
  });

  function exportCsvRadios() {
    if (radios.length === 0) {
      toast('Nenhum registro para exportar.', 'error');
      return;
    }
    const header = ['Nº Série', 'Modelo', 'ID Digital', 'ID Analógico', 'Frota', 'Área', 'Responsável', 'Status', 'Data de aquisição'];
    const rows = radios.map((r) => [
      r.numeroSerie, r.modelo || '', r.idDigital || '', r.idAnalogico || '',
      r.frota ? `${r.frota.numero} - ${r.frota.nome}` : '', r.area?.nome || '', r.responsavel?.nome || '',
      r.status, formatDate(r.dataAquisicao),
    ]);
    downloadCsv('relatorio-radios.csv', header, rows);
    toast('CSV exportado com sucesso.');
  }

  function exportCsvOs() {
    if (os.length === 0) {
      toast('Nenhum registro para exportar.', 'error');
      return;
    }
    const header = ['OS', 'Rádio/Frota', 'Defeito', 'Tipo', 'Técnico', 'Data', 'Status', 'Insumos'];
    const rows = os.map((m) => [
      m.os, vinculoLabel(m), m.titulo, m.tipo, m.tecnico || '', formatDate(m.data), m.status,
      (m.insumos || []).map((i) => i.nome).join('; '),
    ]);
    downloadCsv('relatorio-manutencoes-radios.csv', header, rows);
    toast('CSV exportado com sucesso.');
  }

  async function exportPdf(path, filtros, filename) {
    setExportingPdf(true);
    try {
      await api.download(`${path}${qs(filtros)}`, filename);
      toast('PDF exportado com sucesso.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className={`tab ${tab === 'radios' ? 'active' : ''}`} onClick={() => setTab('radios')}>Rádios</div>
        <div className={`tab ${tab === 'os' ? 'active' : ''}`} onClick={() => setTab('os')}>Manutenções</div>
      </div>

      {tab === 'radios' && (
        <div>
          <FiltrosRelatorio filtros={filtrosRadios} onChange={setFiltrosRadios} frotas={frotas} />

          <div className="flex justify-between items-center mb-16" style={{ marginTop: 14 }}>
            <span className="text-muted" style={{ fontSize: 12.5 }}>{radios.length} rádio(s) encontrado(s)</span>
            <div className="flex" style={{ gap: 8 }}>
              <button className="btn btn-sm" onClick={exportCsvRadios}>
                <Icon name="download" size={14} /> Exportar CSV
              </button>
              <button className="btn btn-sm btn-primary" disabled={exportingPdf} onClick={() => exportPdf('/radios/export/pdf', radiosParams, 'relatorio-radios.pdf')}>
                <Icon name="print" size={14} /> {exportingPdf ? 'Gerando…' : 'Exportar PDF'}
              </button>
            </div>
          </div>

          {loadingRadios && <div className="center-py"><div className="spinner" /></div>}

          {!loadingRadios && radios.length === 0 && (
            <div className="empty-state"><p>Nenhum rádio encontrado para os filtros selecionados.</p></div>
          )}

          {!loadingRadios && radios.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nº Série</th><th>Modelo</th><th>ID Digital</th><th>ID Analógico</th>
                    <th>Frota</th><th>Área</th><th>Responsável</th><th>Status</th><th>Aquisição</th>
                  </tr>
                </thead>
                <tbody>
                  {radios.map((r) => (
                    <tr key={r.id}>
                      <td className="mono" style={{ color: 'var(--accent)' }}>{r.numeroSerie}</td>
                      <td>{r.modelo || '—'}</td>
                      <td className="mono">{r.idDigital || '—'}</td>
                      <td className="mono">{r.idAnalogico || '—'}</td>
                      <td>{r.frota ? `${r.frota.numero} · ${r.frota.nome}` : '—'}</td>
                      <td>{r.area?.nome || '—'}</td>
                      <td>{r.responsavel?.nome || '—'}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{formatDate(r.dataAquisicao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'os' && (
        <div>
          <FiltrosRelatorio filtros={filtrosOs} onChange={setFiltrosOs} frotas={frotas} />

          <div className="flex justify-between items-center mb-16" style={{ marginTop: 14 }}>
            <span className="text-muted" style={{ fontSize: 12.5 }}>{os.length} ordem(ns) de serviço encontrada(s)</span>
            <div className="flex" style={{ gap: 8 }}>
              <button className="btn btn-sm" onClick={exportCsvOs}>
                <Icon name="download" size={14} /> Exportar CSV
              </button>
              <button className="btn btn-sm btn-primary" disabled={exportingPdf} onClick={() => exportPdf('/manutencoes-radios/export/pdf', filtrosOs, 'relatorio-manutencoes-radios.pdf')}>
                <Icon name="print" size={14} /> {exportingPdf ? 'Gerando…' : 'Exportar PDF'}
              </button>
            </div>
          </div>

          {loadingOs && <div className="center-py"><div className="spinner" /></div>}

          {!loadingOs && os.length === 0 && (
            <div className="empty-state"><p>Nenhuma ordem de serviço encontrada para os filtros selecionados.</p></div>
          )}

          {!loadingOs && os.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>OS</th><th>Rádio / Frota</th><th>Defeito</th><th>Tipo</th>
                    <th>Técnico</th><th>Data</th><th>Status</th><th>Insumos</th>
                  </tr>
                </thead>
                <tbody>
                  {os.map((m) => (
                    <tr key={m.id}>
                      <td className="mono" style={{ color: 'var(--accent)' }}>{m.os}</td>
                      <td className="mono">{vinculoLabel(m)}</td>
                      <td>{m.titulo}</td>
                      <td>{m.tipo}</td>
                      <td>{m.tecnico || '—'}</td>
                      <td>{formatDate(m.data)}</td>
                      <td><StatusBadge status={m.status} /></td>
                      <td>{m.insumos?.length ? m.insumos.map((i) => i.nome).join(', ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
