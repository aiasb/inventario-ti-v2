import { useMemo, useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { FiltersBar } from '../components/FiltersBar.jsx';
import { Sparkline } from '../components/Sparkline.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { ColumnChart } from '../components/ColumnChart.jsx';
import { ageInYears, formatAge, formatDate, formatDateTime, warrantyStatus } from '../utils/format.js';

const VIEW_TABS = ['Visão geral', 'Por tipo', 'Por status', 'Por setor', 'Idade por setor'];
const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function monthKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function delta(atual, anterior) {
  if (anterior === 0) return atual === 0 ? { pct: 0, dir: 'flat' } : { pct: null, dir: 'up' };
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

function DeltaBadge({ atual, anterior }) {
  const d = delta(atual, anterior);
  const arrow = d.dir === 'up' ? '↑' : d.dir === 'down' ? '↓' : '→';
  const texto = d.pct === null ? 'novo' : `${d.pct > 0 ? '+' : ''}${d.pct}%`;
  return <span className={`kpi-delta ${d.dir}`}>{arrow} {texto} vs. mês anterior</span>;
}

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

// Mesma ideia do monthBuckets, mas olhando para frente — usado no sparkline de
// "Garantias a vencer", que é uma métrica prospectiva (não tem sentido montar
// uma série de meses passados para ela).
function futureMonthBuckets(items, dateFn, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
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
  const { data: manutData } = useFetch('/manutencoes', { limit: 300, sort: '-data' });

  const equipamentos = equipData?.data || [];
  const manutencoes = manutData?.data || [];
  const ultimasOs = useMemo(() => manutencoes.slice(0, 8), [manutencoes]);

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
  const porSetorQtd = useMemo(() => groupCount(equipamentos, (e) => e.setor?.nome), [equipamentos]);

  const manutencoesPorMes = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: MONTH_LABELS[d.getMonth()], key: monthKey(d), corretiva: 0, preventiva: 0 });
    }
    for (const m of manutencoes) {
      if (!m.data) continue;
      const bucket = buckets.find((b) => b.key === monthKey(new Date(m.data)));
      if (!bucket) continue;
      if (m.tipo === 'Corretiva') bucket.corretiva += 1;
      else bucket.preventiva += 1;
    }
    return buckets;
  }, [manutencoes]);

  const comparacaoMensal = useMemo(() => {
    const now = new Date();
    const chaveAtual = monthKey(now);
    const chaveAnterior = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    function contarNoMes(items, dateFn, chave) {
      return items.filter((item) => {
        const raw = dateFn(item);
        return raw ? monthKey(new Date(raw)) === chave : false;
      }).length;
    }

    return {
      equipamentos: {
        atual: contarNoMes(equipamentos, (e) => e.createdAt, chaveAtual),
        anterior: contarNoMes(equipamentos, (e) => e.createdAt, chaveAnterior),
      },
      manutencoes: {
        atual: contarNoMes(manutencoes, (m) => m.data, chaveAtual),
        anterior: contarNoMes(manutencoes, (m) => m.data, chaveAnterior),
      },
      garantias: {
        atual: contarNoMes(equipamentos, (e) => e.dataGarantia, chaveAtual),
        anterior: contarNoMes(equipamentos, (e) => e.dataGarantia, chaveAnterior),
      },
    };
  }, [equipamentos, manutencoes]);

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
  const sparkGarantias = useMemo(() => futureMonthBuckets(equipamentos, (e) => e.dataGarantia), [equipamentos]);

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
            <Sparkline data={sparkGarantias} color="#d95c4a" />
          </div>
        </div>
        <div className="kpi-card accent">
          <div className="kpi-label">Em estoque</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.emEstoque}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Idade média do parque</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ fontSize: 22 }}>{formatAge(idadeMedia)}</span>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <h3>Comparação com o mês anterior</h3>
        </div>
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
          <div>
            <div className="stat-label">Equipamentos cadastrados</div>
            <div className="stat-value">{comparacaoMensal.equipamentos.atual}</div>
            <DeltaBadge atual={comparacaoMensal.equipamentos.atual} anterior={comparacaoMensal.equipamentos.anterior} />
          </div>
          <div>
            <div className="stat-label">Manutenções abertas</div>
            <div className="stat-value">{comparacaoMensal.manutencoes.atual}</div>
            <DeltaBadge atual={comparacaoMensal.manutencoes.atual} anterior={comparacaoMensal.manutencoes.anterior} />
          </div>
          <div>
            <div className="stat-label">Garantias vencendo no mês</div>
            <div className="stat-value">{comparacaoMensal.garantias.atual}</div>
            <DeltaBadge atual={comparacaoMensal.garantias.atual} anterior={comparacaoMensal.garantias.anterior} />
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
          gridTemplateColumns: tab === 'Visão geral' ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
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
        {(tab === 'Visão geral' || tab === 'Por setor') && (
          <div className="panel">
            <div className="panel-header">
              <h3>Distribuição por setor</h3>
            </div>
            <div className="panel-body">
              <BarList data={porSetorQtd} colorVar="--accent" />
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
                  <div className="text-muted mono" style={{ fontSize: 11.5 }}>{e.serial}</div>
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
            {ultimasOs.length === 0 && (
              <div className="empty-state">
                <p>Nenhuma ordem de serviço registrada.</p>
              </div>
            )}
            {ultimasOs.map((m) => (
              <div key={m.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div className="flex justify-between items-center">
                  <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{m.os}</span>
                  <StatusBadge status={m.status} />
                </div>
                <div style={{ fontSize: 13, margin: '4px 0 2px' }}>{m.titulo}</div>
                <div className="text-muted" style={{ fontSize: 11.5 }}>
                  {m.equipamento.serial} · {formatDateTime(m.data)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-header">
          <h3>Manutenções por mês</h3>
        </div>
        <div className="panel-body">
          <ColumnChart
            data={manutencoesPorMes}
            series={[
              { key: 'corretiva', label: 'Corretivas', color: 'var(--accent)' },
              { key: 'preventiva', label: 'Preventivas', color: '#6b83e8' },
            ]}
          />
        </div>
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}
    </div>
  );
}
