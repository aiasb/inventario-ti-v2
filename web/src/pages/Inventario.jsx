import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { FiltersBar } from '../components/FiltersBar.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Drawer } from '../components/Drawer.jsx';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, warrantyStatus } from '../utils/format.js';

const STATUS_OPTIONS = ['Ativo', 'Manutencao', 'Estoque', 'Baixado'];

const COLUMNS = [
  { key: 'serial', label: 'Serial' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'hostname', label: 'Hostname' },
  { key: 'usuario', label: 'Usuário' },
  { key: 'setor', label: 'Setor' },
  { key: 'dataGarantia', label: 'Garantia' },
  { key: 'status', label: 'Status' },
];

function emptyForm() {
  return {
    tipoId: '', modelo: '', serial: '', hostname: '', imei: '', setorId: '',
    fornecedorId: '', responsavelId: '', status: 'Estoque', dataAquisicao: '', dataGarantia: '', observacoes: '',
  };
}

export function Inventario() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState('lista');
  const [filters, setFilters] = useState({});
  const [colFilters, setColFilters] = useState({ serial: '', tipoId: '', modelo: '', usuario: '' });
  const [sort, setSort] = useState('-updatedAt');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [drawerId, setDrawerId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const tipos = useLookup('/tipos-equipamento');
  const setores = useLookup('/setores');
  const fornecedores = useLookup('/fornecedores');
  const responsaveis = useLookup('/responsaveis');

  const queryParams = {
    ...filters,
    serial: colFilters.serial || undefined,
    tipoId: colFilters.tipoId || undefined,
    modelo: colFilters.modelo || undefined,
    usuario: colFilters.usuario || undefined,
    sort,
    page,
    limit: 20,
  };

  const { data, loading, reload } = useFetch('/equipamentos', queryParams);
  const equipamentos = data?.data || [];
  const meta = data?.meta;

  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      openNew();
      setSearchParams({}, { replace: true });
    }
    const id = searchParams.get('id');
    if (id) {
      setDrawerId(Number(id));
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  usePageHeader({
    breadcrumb: 'Operação / Inventário',
    title: 'Inventário',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Novo equipamento
      </button>
    ),
  });

  function toggleSort(key) {
    setPage(1);
    setSort((prev) => (prev === key ? `-${key}` : prev === `-${key}` ? key : key));
  }

  function sortArrow(key) {
    if (sort === key) return '↑';
    if (sort === `-${key}`) return '↓';
    return '';
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === equipamentos.length ? new Set() : new Set(equipamentos.map((e) => e.id))));
  }

  async function handleBulk(action) {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      if (action === 'baixa') {
        await api.patch('/equipamentos/bulk', { ids, status: 'Baixado' });
        toast(`${ids.length} equipamento(s) dado(s) de baixa.`);
      } else if (action === 'ativar') {
        const result = await api.patch('/equipamentos/bulk', { ids, status: 'Ativo' });
        if (result.skipped > 0) {
          toast(`${result.affected} marcado(s) como Ativo. ${result.skipped} sem responsável foram ignorado(s).`, 'error');
        } else {
          toast(`${result.affected} equipamento(s) marcados como Ativo.`);
        }
      }
      setSelected(new Set());
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function exportCsv() {
    const header = ['Serial', 'Tipo', 'Modelo', 'Hostname', 'IMEI', 'Usuário', 'Setor', 'Status', 'Garantia'];
    const rows = equipamentos.map((e) => [
      e.serial, e.tipo?.nome, e.modelo, e.hostname || '', e.imei || '', e.usuarioResponsavel || '',
      e.setor?.nome || '', e.status, formatDate(e.dataGarantia),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario-ti-usina-cacu.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado com sucesso.');
  }

  function openEdit(e) {
    setEditingId(e.id);
    setForm({
      tipoId: e.tipo?.id || '', modelo: e.modelo, serial: e.serial,
      hostname: e.hostname || '', imei: e.imei || '', setorId: e.setor?.id || '',
      fornecedorId: e.fornecedor?.id || '', responsavelId: e.responsavel?.id || '',
      status: e.status, dataAquisicao: e.dataAquisicao?.slice(0, 10) || '', dataGarantia: e.dataGarantia?.slice(0, 10) || '',
      observacoes: e.observacoes || '',
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (form.status === 'Ativo' && !form.responsavelId) {
      toast('Selecione um responsável para equipamentos com status Ativo.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      if (editingId) {
        await api.put(`/equipamentos/${editingId}`, payload);
        toast('Equipamento atualizado.');
      } else {
        await api.post('/equipamentos', payload);
        toast('Equipamento cadastrado.');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const hasFilters = Object.values(filters).some(Boolean) || Object.values(colFilters).some(Boolean);
  const isCelular = tipos.find((t) => String(t.id) === String(form.tipoId))?.nome === 'Celular';

  return (
    <div>
      <FiltersBar filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      <div className="flex justify-between items-center mb-12">
        <div className="flex gap-8">
          <button className={`btn btn-sm ${viewMode === 'lista' ? 'btn-primary' : ''}`} onClick={() => setViewMode('lista')}>
            <Icon name="list" size={14} /> Lista
          </button>
          <button className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : ''}`} onClick={() => setViewMode('cards')}>
            <Icon name="grid" size={14} /> Cards
          </button>
        </div>
        <button className="btn btn-sm" onClick={exportCsv}>
          <Icon name="download" size={14} /> Exportar CSV
        </button>
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="count">{selected.size} selecionado(s)</span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => handleBulk('ativar')}>Transferir p/ Ativo</button>
          <button className="btn btn-sm" onClick={() => toast('Selecione os equipamentos e finalize em Termos > Novo termo.')}>Gerar termo</button>
          <button className="btn btn-sm btn-danger" onClick={() => handleBulk('baixa')}>Dar baixa</button>
        </div>
      )}

      {viewMode === 'lista' ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" className="checkbox" checked={selected.size > 0 && selected.size === equipamentos.length} onChange={toggleSelectAll} />
                </th>
                {COLUMNS.map((c) => (
                  <th key={c.key} onClick={() => toggleSort(c.key)}>
                    {c.label}
                    <span className="sort-arrow">{sortArrow(c.key)}</span>
                  </th>
                ))}
              </tr>
              <tr className="filter-row">
                <th />
                <th><input className="input" placeholder="Filtrar serial…" value={colFilters.serial} onChange={(e) => { setColFilters((s) => ({ ...s, serial: e.target.value })); setPage(1); }} /></th>
                <th>
                  <select className="input" value={colFilters.tipoId} onChange={(e) => { setColFilters((s) => ({ ...s, tipoId: e.target.value })); setPage(1); }}>
                    <option value="">Todos</option>
                    {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </th>
                <th><input className="input" placeholder="Filtrar modelo…" value={colFilters.modelo} onChange={(e) => { setColFilters((s) => ({ ...s, modelo: e.target.value })); setPage(1); }} /></th>
                <th />
                <th><input className="input" placeholder="Filtrar usuário…" value={colFilters.usuario} onChange={(e) => { setColFilters((s) => ({ ...s, usuario: e.target.value })); setPage(1); }} /></th>
                <th /><th /><th />
              </tr>
            </thead>
            <tbody>
              {equipamentos.map((e) => {
                const w = warrantyStatus(e.dataGarantia);
                return (
                  <tr key={e.id} onClick={() => setDrawerId(e.id)}>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <input type="checkbox" className="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} />
                    </td>
                    <td className="mono" style={{ color: 'var(--accent)' }}>{e.serial}</td>
                    <td>{e.tipo?.nome}</td>
                    <td>{e.modelo}</td>
                    <td className="mono text-secondary">{(e.tipo?.nome === 'Celular' ? e.imei : e.hostname) || '—'}</td>
                    <td>{e.usuarioResponsavel || '—'}</td>
                    <td className="text-secondary">{e.setor?.nome || '—'}</td>
                    <td><span className={`warranty-text ${w.className}`}>{w.className === 'ok' ? formatDate(e.dataGarantia) : `${formatDate(e.dataGarantia)} · ${w.label}`}</span></td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {equipamentos.length === 0 && !loading && (
            <div className="empty-state">
              <div className="icon">🗄️</div>
              <p>Nenhum equipamento encontrado{hasFilters ? ' para os filtros aplicados' : ''}.</p>
              {hasFilters && (
                <button className="btn btn-sm" onClick={() => { setFilters({}); setColFilters({ serial: '', tipoId: '', modelo: '', usuario: '' }); }}>
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="cards-grid">
            {equipamentos.map((e) => {
              const w = warrantyStatus(e.dataGarantia);
              return (
                <div className="equip-card" key={e.id} onClick={() => setDrawerId(e.id)}>
                  <div className="equip-card-top">
                    <span className="type-chip">{e.tipo?.nome?.slice(0, 3).toUpperCase()}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="serial mono">{e.serial}</div>
                  <div className="modelo">{e.modelo}</div>
                  <div className="meta-row"><span>Usuário</span><span>{e.usuarioResponsavel || '—'}</span></div>
                  <div className="meta-row"><span>Setor</span><span>{e.setor?.nome || '—'}</span></div>
                  <div className="meta-row">
                    <span>{e.tipo?.nome === 'Celular' ? 'IMEI' : 'Hostname'}</span>
                    <span className="mono">{(e.tipo?.nome === 'Celular' ? e.imei : e.hostname) || '—'}</span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill ${w.className}`} style={{ width: w.days === null ? '0%' : `${Math.max(0, Math.min(100, 100 - (w.days / 365) * 100))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {equipamentos.length === 0 && !loading && (
            <div className="empty-state">
              <p>Nenhum equipamento encontrado{hasFilters ? ' para os filtros aplicados' : ''}.</p>
            </div>
          )}
        </>
      )}

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center" style={{ marginTop: 14 }}>
          <span className="text-muted" style={{ fontSize: 12.5 }}>
            Página {meta.page} de {meta.totalPages} · {meta.total} equipamento(s)
          </span>
          <div className="flex gap-8">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
          </div>
        </div>
      )}

      {drawerId && (
        <EquipamentoDrawer
          id={drawerId}
          onClose={() => setDrawerId(null)}
          onEdit={(e) => { setDrawerId(null); openEdit(e); }}
        />
      )}

      {showForm && (
        <Modal title={editingId ? 'Editar equipamento' : 'Novo equipamento'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field">
                <label>Tipo *</label>
                <select
                  className="input"
                  required
                  value={form.tipoId}
                  onChange={(e) => setForm((f) => ({ ...f, tipoId: e.target.value, hostname: '', imei: '' }))}
                >
                  <option value="">Selecione</option>
                  {tipos.filter((t) => t.ativo || String(t.id) === String(form.tipoId)).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}{!t.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field full">
                <label>Modelo *</label>
                <input className="input" required value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div className="field">
                <label>Número de série *</label>
                <input className="input" required value={form.serial} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} />
              </div>
              {isCelular ? (
                <div className="field">
                  <label>IMEI</label>
                  <input className="input" placeholder="15 dígitos" value={form.imei} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} />
                </div>
              ) : (
                <div className="field">
                  <label>Hostname</label>
                  <input className="input" placeholder="UCACU-NB-0000" value={form.hostname} onChange={(e) => setForm((f) => ({ ...f, hostname: e.target.value }))} />
                </div>
              )}
              <div className="field">
                <label>Setor</label>
                <select className="input" value={form.setorId} onChange={(e) => setForm((f) => ({ ...f, setorId: e.target.value }))}>
                  <option value="">—</option>
                  {setores.filter((s) => s.ativo || String(s.id) === String(form.setorId)).map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}{!s.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Fornecedor</label>
                <select className="input" value={form.fornecedorId} onChange={(e) => setForm((f) => ({ ...f, fornecedorId: e.target.value }))}>
                  <option value="">—</option>
                  {fornecedores.filter((f2) => f2.ativo || String(f2.id) === String(form.fornecedorId)).map((f2) => (
                    <option key={f2.id} value={f2.id}>{f2.nome}{!f2.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Responsável{form.status === 'Ativo' ? ' *' : ''}</label>
                <select
                  className="input"
                  required={form.status === 'Ativo'}
                  value={form.responsavelId}
                  onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}
                >
                  <option value="">— Nenhum (fica em estoque) —</option>
                  {responsaveis.filter((r) => r.ativo || String(r.id) === String(form.responsavelId)).map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}{!r.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'Manutencao' ? 'Manutenção' : s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Data de aquisição</label>
                <input type="date" className="input" value={form.dataAquisicao} onChange={(e) => setForm((f) => ({ ...f, dataAquisicao: e.target.value }))} />
              </div>
              <div className="field">
                <label>Fim da garantia</label>
                <input type="date" className="input" value={form.dataGarantia} onChange={(e) => setForm((f) => ({ ...f, dataGarantia: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Observações</label>
                <textarea className="input" rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function EquipamentoDrawer({ id, onClose, onEdit }) {
  const { data: equip, loading } = useFetch(`/equipamentos/${id}`, {}, [id]);

  if (loading || !equip) {
    return (
      <Drawer title="Carregando…" onClose={onClose}>
        <div className="center-py"><div className="spinner" /></div>
      </Drawer>
    );
  }

  const w = warrantyStatus(equip.dataGarantia);

  return (
    <Drawer
      title={equip.serial}
      subtitle={<StatusBadge status={equip.status} />}
      onClose={onClose}
    >
      <div className="detail-grid">
        <div className="detail-field">
          <div className="label-caps">Tipo</div>
          <div className="value">{equip.tipo?.nome || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Modelo</div>
          <div className="value">{equip.modelo}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Nº de série</div>
          <div className="value mono">{equip.serial}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">{equip.tipo?.nome === 'Celular' ? 'IMEI' : 'Hostname'}</div>
          <div className="value mono">{(equip.tipo?.nome === 'Celular' ? equip.imei : equip.hostname) || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Usuário</div>
          <div className="value">{equip.usuarioResponsavel || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Setor</div>
          <div className="value">{equip.setor?.nome || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Aquisição</div>
          <div className="value">{formatDate(equip.dataAquisicao)}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Garantia</div>
          <div className={`value warranty-text ${w.className}`}>{formatDate(equip.dataGarantia)}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Fornecedor</div>
          <div className="value">{equip.fornecedor?.nome || '—'}</div>
        </div>
      </div>

      <button className="btn btn-sm mb-16" onClick={() => onEdit(equip)}>Editar equipamento</button>

      <div className="section-title">Histórico de manutenções</div>
      {(!equip.manutencoes || equip.manutencoes.length === 0) && (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <p>Nenhuma manutenção registrada para este equipamento.</p>
        </div>
      )}
      {equip.manutencoes?.map((m) => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
          <div className="flex justify-between items-center">
            <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{m.os}</span>
            <StatusBadge status={m.status} />
          </div>
          <div style={{ fontSize: 13, margin: '4px 0 2px' }}>{m.titulo}</div>
          <div className="text-muted" style={{ fontSize: 11.5 }}>{m.tipo} · {m.tecnico || 'sem técnico'} · {formatDate(m.data)}</div>
        </div>
      ))}
    </Drawer>
  );
}
