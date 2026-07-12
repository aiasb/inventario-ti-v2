import { useMemo, useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { FiltersBar } from '../components/FiltersBar.jsx';
import { Sparkline } from '../components/Sparkline.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { ageInYears, formatAge, formatDate, formatDateTime, warrantyStatus } from '../utils/format.js';

const VIEW_TABS = ['Visão geral', 'Por tipo', 'Por status', 'Idade por setor'];

function BarList({ data, colorVar = '--accent' }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      {data.map((d) => (
        <div key={d.label} style={{ marginBottom: 10 }}>
          <div className="flex justify-between" style={{ fontSize: 12.5, marginBottom: 4 }}>
            <span className="text-secondary">{d.label}</span>
            <span className="mono">{d.count}</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(d.count / max) * 100}%`, background: `var(${colorVar})` }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <div className="text-muted" style={{ fontSize: 12.5 }}>Sem dados.</div>}
    </div>
  );
}

function AgeBarList({ data }) {
  const max = Math.max(...data.map((d) => d.years), 1);
  return (
    <div>
      {data.map((d) => (
        <div key={d.label} style={{ marginBottom: 10 }}>
          <div className="flex justify-between" style={{ fontSize: 12.5, marginBottom: 4 }}>
            <span className="text-secondary">{d.label}</span>
            <span className="mono">{formatAge(d.years)}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(d.years / max) * 100}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <div className="text-muted" style={{ fontSize: 12.5 }}>Sem dados.</div>}
    </div>
  );
}

function groupCount(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item) || 'Não informado';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function groupAverageAge(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const years = ageInYears(item.dataAquisicao);
    if (years === null) continue;
    const key = keyFn(item) || 'Não informado';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(years);
  }
  return [...map.entries()]
    .map(([label, values]) => ({ label, years: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => b.years - a.years);
}

function monthBuckets(items, dateFn, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, count: 0 });
  }
  for (const item of items) {
    const raw = dateFn(item);
    if (!raw) continue;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.count += 1;
  }
  return buckets.map((b) => b.count);
}

export function Dashboard() {
  usePageHeader({ breadcrumb: 'Operação / Dashboard', title: 'Dashboard' });
  const [filters, setFilters] = useState({});
  const [tab, setTab] = useState('Visão geral');

  const { data: equipData, loading } = useFetch('/equipamentos', { ...filters, limit: 500 });
  const { data: manutData } = useFetch('/manutencoes', { limit: 8, sort: '-data' });

  const equipamentos = equipData?.data || [];
  const manutencoes = manutData?.data || [];

  const kpis = useMemo(() => {
    const total = equipamentos.length;
    const emManutencao = equipamentos.filter((e) => e.status === 'Manutencao').length;
    const emEstoque = equipamentos.filter((e) => e.status === 'Estoque').length;
    const garantiasVencendo = equipamentos.filter((e) => {
      const w = warrantyStatus(e.dataGarantia);
      return w.days !== null && w.days >= 0 && w.days <= 120;
    }).length;
    return { total, emManutencao, emEstoque, garantiasVencendo };
  }, [equipamentos]);

  const porTipo = useMemo(() => groupCount(equipamentos, (e) => e.tipo?.nome), [equipamentos]);
  const porStatus = useMemo(
    () => groupCount(equipamentos, (e) => (e.status === 'Manutencao' ? 'Manutenção' : e.status)),
    [equipamentos]
  );

  const idadeMedia = useMemo(() => {
    const idades = equipamentos.map((e) => ageInYears(e.dataAquisicao)).filter((y) => y !== null);
    if (idades.length === 0) return null;
    return idades.reduce((a, b) => a + b, 0) / idades.length;
  }, [equipamentos]);

  const idadePorSetor = useMemo(() => groupAverageAge(equipamentos, (e) => e.setor?.nome), [equipamentos]);

  const garantiasProximas = useMemo(() => {
    return equipamentos
      .map((e) => ({ e, w: warrantyStatus(e.dataGarantia) }))
      .filter(({ w }) => w.days !== null && w.days >= 0 && w.days <= 120)
      .sort((a, b) => a.w.days - b.w.days)
      .slice(0, 6);
  }, [equipamentos]);

  const sparkTotal = useMemo(() => {
    const buckets = monthBuckets(equipamentos, (e) => e.dataAquisicao);
    let acc = 0;
    return buckets.map((v) => (acc += v));
  }, [equipamentos]);
  const sparkManut = useMemo(() => monthBuckets(manutencoes, (m) => m.data), [manutencoes]);

  return (
    <div>
      <FiltersBar filters={filters} onChange={setFilters} />

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total de equipamentos</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.total}</span>
            <Sparkline data={sparkTotal} />
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-label">Em manutenção</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.emManutencao}</span>
            <Sparkline data={sparkManut} color="#e0b45c" />
          </div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-label">Garantias a vencer (120d)</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.garantiasVencendo}</span>
            <Sparkline data={[2, 3, 1, 4, kpis.garantiasVencendo, kpis.garantiasVencendo]} color="#d95c4a" />
          </div>
        </div>
        <div className="kpi-card accent">
          <div className="kpi-label">Em estoque</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.emEstoque}</span>
            <Sparkline data={[kpis.emEstoque, kpis.emEstoque, kpis.emEstoque - 1, kpis.emEstoque]} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Idade média do parque</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ fontSize: 22 }}>{formatAge(idadeMedia)}</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        {VIEW_TABS.map((t) => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: tab === 'Visão geral' ? 'repeat(3, 1fr)' : '1fr',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {(tab === 'Visão geral' || tab === 'Por tipo') && (
          <div className="panel">
            <div className="panel-header">
              <h3>Por tipo de equipamento</h3>
            </div>
            <div className="panel-body">
              <BarList data={porTipo} />
            </div>
          </div>
        )}
        {(tab === 'Visão geral' || tab === 'Por status') && (
          <div className="panel">
            <div className="panel-header">
              <h3>Por status</h3>
            </div>
            <div className="panel-body">
              <BarList data={porStatus} colorVar="--danger" />
            </div>
          </div>
        )}
        {(tab === 'Visão geral' || tab === 'Idade por setor') && (
          <div className="panel">
            <div className="panel-header">
              <h3>Idade média por setor</h3>
            </div>
            <div className="panel-body">
              <AgeBarList data={idadePorSetor} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        <div className="panel">
          <div className="panel-header">
            <h3>Garantias próximas do vencimento</h3>
          </div>
          <div className="panel-body">
            {garantiasProximas.length === 0 && (
              <div className="empty-state">
                <p>Nenhuma garantia vencendo nos próximos 120 dias.</p>
              </div>
            )}
            {garantiasProximas.map(({ e, w }) => (
              <div key={e.id} className="flex justify-between items-center" style={{ padding: '9px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.modelo}</div>
                  <div className="text-muted mono" style={{ fontSize: 11.5 }}>{e.patrimonio} · {e.serial}</div>
                </div>
                <span className={`warranty-text ${w.className}`} style={{ fontSize: 12.5 }}>
                  {formatDate(e.dataGarantia)} · {w.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Últimas ordens de serviço</h3>
          </div>
          <div className="panel-body">
            {manutencoes.length === 0 && (
              <div className="empty-state">
                <p>Nenhuma ordem de serviço registrada.</p>
              </div>
            )}
            {manutencoes.map((m) => (
              <div key={m.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div className="flex justify-between items-center">
                  <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{m.os}</span>
                  <StatusBadge status={m.status} />
                </div>
                <div style={{ fontSize: 13, margin: '4px 0 2px' }}>{m.titulo}</div>
                <div className="text-muted" style={{ fontSize: 11.5 }}>
                  {m.equipamento.patrimonio} · {formatDateTime(m.data)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}
    </div>
  );
}
