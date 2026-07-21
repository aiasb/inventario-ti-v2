import { useEffect, useState } from 'react';
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
import { formatDate } from '../utils/format.js';

const COLUMNS = [
  { key: 'numeroSerie', label: 'Nº de série' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'frota', label: 'Frota' },
  { key: 'area', label: 'Área' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'status', label: 'Status' },
];

function emptyForm() {
  return {
    numeroSerie: '', modelo: '', idDigital: '', idAnalogico: '', frotaId: '', areaId: '', responsavelId: '',
    status: 'Ativo', dataAquisicao: '', observacoes: '',
  };
}

export function Radios() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({});
  const [colFilters, setColFilters] = useState({ numeroSerie: '', frotaId: '' });
  const [sort, setSort] = useState('-updatedAt');
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const frotas = useLookup('/frotas');
  const areasGeo = useLookup('/areas-geo');
  const responsaveisGeo = useLookup('/responsaveis-geo');
  const statusOptions = useLookup('/status-ativo');

  const queryParams = {
    ...filters,
    numeroSerie: colFilters.numeroSerie || undefined,
    frotaId: colFilters.frotaId || undefined,
    sort,
    page,
    limit: 20,
  };

  const { data, loading, reload } = useFetch('/radios', queryParams);
  const radios = data?.data || [];
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
    breadcrumb: 'Geotecnologia / Rádios',
    title: 'Rádios',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Novo rádio
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

  function openEdit(r) {
    setEditingId(r.id);
    setForm({
      numeroSerie: r.numeroSerie, modelo: r.modelo || '',
      idDigital: r.idDigital || '', idAnalogico: r.idAnalogico || '',
      frotaId: r.frota?.id || '',
      areaId: r.area?.id || '', responsavelId: r.responsavel?.id || '',
      status: r.status, dataAquisicao: r.dataAquisicao?.slice(0, 10) || '', observacoes: r.observacoes || '',
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      if (editingId) {
        await api.put(`/radios/${editingId}`, payload);
        toast('Rádio atualizado.');
      } else {
        await api.post('/radios', payload);
        toast('Rádio cadastrado.');
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

  return (
    <div>
      <FiltersBar filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} showSetor={false} />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}>
                  {c.label}
                  <span className="sort-arrow">{sortArrow(c.key)}</span>
                </th>
              ))}
            </tr>
            <tr className="filter-row">
              <th><input className="input" placeholder="Filtrar nº série…" value={colFilters.numeroSerie} onChange={(e) => { setColFilters((s) => ({ ...s, numeroSerie: e.target.value })); setPage(1); }} /></th>
              <th />
              <th>
                <select className="input" value={colFilters.frotaId} onChange={(e) => { setColFilters((s) => ({ ...s, frotaId: e.target.value })); setPage(1); }}>
                  <option value="">Todas</option>
                  {frotas.map((f) => <option key={f.id} value={f.id}>{f.numero} · {f.nome}</option>)}
                </select>
              </th>
              <th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {radios.map((r) => (
              <tr key={r.id} onClick={() => setDrawerId(r.id)}>
                <td className="mono" style={{ color: 'var(--accent)' }}>{r.numeroSerie}</td>
                <td>{r.modelo || '—'}</td>
                <td className="text-secondary">{r.frota ? `${r.frota.numero} · ${r.frota.nome}` : '—'}</td>
                <td className="text-secondary">{r.area?.nome || '—'}</td>
                <td>{r.responsavel?.nome || '—'}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {radios.length === 0 && !loading && (
          <div className="empty-state">
            <div className="icon">📻</div>
            <p>Nenhum rádio encontrado{hasFilters ? ' para os filtros aplicados' : ''}.</p>
            {hasFilters && (
              <button className="btn btn-sm" onClick={() => { setFilters({}); setColFilters({ numeroSerie: '', frotaId: '' }); }}>
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center" style={{ marginTop: 14 }}>
          <span className="text-muted" style={{ fontSize: 12.5 }}>
            Página {meta.page} de {meta.totalPages} · {meta.total} rádio(s)
          </span>
          <div className="flex gap-8">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
          </div>
        </div>
      )}

      {drawerId && (
        <RadioDrawer
          id={drawerId}
          onClose={() => setDrawerId(null)}
          onEdit={(r) => { setDrawerId(null); openEdit(r); }}
          onDeleted={() => { setDrawerId(null); reload(); }}
        />
      )}

      {showForm && (
        <Modal title={editingId ? 'Editar rádio' : 'Novo rádio'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field full">
                <label>Número de série *</label>
                <input className="input" required value={form.numeroSerie} onChange={(e) => setForm((f) => ({ ...f, numeroSerie: e.target.value }))} />
              </div>
              <div className="field">
                <label>Modelo</label>
                <input className="input" value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div className="field">
                <label>ID Digital</label>
                <input className="input" value={form.idDigital} onChange={(e) => setForm((f) => ({ ...f, idDigital: e.target.value }))} />
              </div>
              <div className="field">
                <label>ID Analógico</label>
                <input className="input" value={form.idAnalogico} onChange={(e) => setForm((f) => ({ ...f, idAnalogico: e.target.value }))} />
              </div>
              <div className="field">
                <label>Frota</label>
                <select className="input" value={form.frotaId} onChange={(e) => setForm((f) => ({ ...f, frotaId: e.target.value }))}>
                  <option value="">—</option>
                  {frotas.filter((f) => f.ativo || String(f.id) === String(form.frotaId)).map((f) => (
                    <option key={f.id} value={f.id}>{f.numero} · {f.nome}{!f.ativo ? ' (inativa)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Área</label>
                <select className="input" value={form.areaId} onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}>
                  <option value="">—</option>
                  {areasGeo.filter((a) => a.ativo || String(a.id) === String(form.areaId)).map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}{!a.ativo ? ' (inativa)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Responsável</label>
                <select className="input" value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}>
                  <option value="">—</option>
                  {responsaveisGeo.filter((r) => r.ativo || String(r.id) === String(form.responsavelId)).map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}{!r.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {statusOptions.filter((s) => s.ativo || s.nome === form.status).map((s) => (
                    <option key={s.id} value={s.nome}>{s.nome === 'Manutencao' ? 'Manutenção' : s.nome}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Data de aquisição</label>
                <input type="date" className="input" value={form.dataAquisicao} onChange={(e) => setForm((f) => ({ ...f, dataAquisicao: e.target.value }))} />
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

function RadioDrawer({ id, onClose, onEdit, onDeleted }) {
  const { toast } = useToast();
  const { data: radio, loading } = useFetch(`/radios/${id}`, {}, [id]);
  const [deleting, setDeleting] = useState(false);

  if (loading || !radio) {
    return (
      <Drawer title="Carregando…" onClose={onClose}>
        <div className="center-py"><div className="spinner" /></div>
      </Drawer>
    );
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir o rádio ${radio.numeroSerie}? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/radios/${radio.id}`);
      toast('Rádio excluído.');
      onDeleted();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Drawer
      title={radio.numeroSerie}
      subtitle={<StatusBadge status={radio.status} />}
      onClose={onClose}
    >
      <div className="detail-grid">
        <div className="detail-field">
          <div className="label-caps">Nº de série</div>
          <div className="value mono">{radio.numeroSerie}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Modelo</div>
          <div className="value">{radio.modelo || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">ID Digital</div>
          <div className="value mono">{radio.idDigital || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">ID Analógico</div>
          <div className="value mono">{radio.idAnalogico || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Frota</div>
          <div className="value">{radio.frota ? `${radio.frota.numero} · ${radio.frota.nome}` : '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Área</div>
          <div className="value">{radio.area?.nome || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Responsável</div>
          <div className="value">{radio.responsavel?.nome || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Aquisição</div>
          <div className="value">{formatDate(radio.dataAquisicao)}</div>
        </div>
      </div>

      <div className="flex gap-8 mb-16">
        <button className="btn btn-sm" onClick={() => onEdit(radio)}>Editar rádio</button>
        <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Excluindo…' : 'Excluir rádio'}
        </button>
      </div>

      <div className="section-title">Histórico de manutenções</div>
      {(!radio.manutencoes || radio.manutencoes.length === 0) && (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <p>Nenhuma manutenção registrada para este rádio.</p>
        </div>
      )}
      {radio.manutencoes?.map((m) => (
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
