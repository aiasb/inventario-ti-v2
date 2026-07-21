import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, formatDateTime } from '../utils/format.js';

const COLUMNS = ['Aberta', 'Em andamento', 'Concluida'];
const COLUMN_LABELS = { Aberta: 'Aberta', 'Em andamento': 'Em andamento', Concluida: 'Concluída' };

function emptyForm() {
  return { modo: 'radio', radioId: '', frotaId: '', titulo: '', tipo: 'Corretiva', tecnico: '', descricao: '', data: '' };
}

function vinculoLabel(m) {
  if (m.radio) return m.radio.numeroSerie;
  if (m.frota) return `Frota ${m.frota.numero} · ${m.frota.nome}`;
  return '—';
}

export function ManutencoesRadios() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('kanban');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [radioSearch, setRadioSearch] = useState('');
  const [confirmMove, setConfirmMove] = useState(null);
  const [detalheItem, setDetalheItem] = useState(null);

  const { data, loading, reload } = useFetch('/manutencoes-radios', { limit: 100, sort: '-data' });
  const manutencoes = data?.data || [];

  const { data: radioData } = useFetch('/radios', { q: radioSearch, limit: 20 }, [radioSearch]);
  const radiosOptions = radioData?.data || [];
  const frotas = useLookup('/frotas');
  const insumos = useLookup('/insumos');

  useEffect(() => {
    if (searchParams.get('nova') === '1') {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePageHeader({
    breadcrumb: 'Geotecnologia / Manutenções (Rádios)',
    title: 'Manutenções (Rádios)',
    action: (
      <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setShowForm(true); }}>
        <Icon name="plus" size={15} /> Nova OS
      </button>
    ),
  });

  function moveStatus(item, status) {
    setConfirmMove({ item, status, insumoIds: [] });
  }

  function toggleInsumo(id) {
    setConfirmMove((c) => {
      const has = c.insumoIds.includes(id);
      return { ...c, insumoIds: has ? c.insumoIds.filter((x) => x !== id) : [...c.insumoIds, id] };
    });
  }

  const precisaInsumo = confirmMove?.status === 'Concluida' && (confirmMove.item.insumos || []).length === 0;

  async function handleConfirmMove() {
    const { item, status, insumoIds } = confirmMove;
    setConfirmMove(null);
    try {
      await api.patch(`/manutencoes-radios/${item.id}/status`, { status, insumoIds: insumoIds.length ? insumoIds : undefined });
      toast(`OS movida para "${COLUMN_LABELS[status]}".`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo,
        tipo: form.tipo,
        tecnico: form.tecnico,
        descricao: form.descricao,
        data: form.data,
        radioId: form.modo === 'radio' ? form.radioId : undefined,
        frotaId: form.modo === 'frota' ? form.frotaId : undefined,
      };
      await api.post('/manutencoes-radios', payload);
      toast('Ordem de serviço criada.');
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col] = manutencoes.filter((m) => m.status === col);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-16">
        <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
          <div className={`tab ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban</div>
          <div className={`tab ${view === 'lista' ? 'active' : ''}`} onClick={() => setView('lista')}>Lista</div>
        </div>
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && manutencoes.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma ordem de serviço registrada ainda.</p>
        </div>
      )}

      {!loading && manutencoes.length > 0 && view === 'kanban' && (
        <div className="kanban-board">
          {COLUMNS.map((col) => (
            <div className="kanban-col" key={col}>
              <div className="kanban-col-header">
                <span>{COLUMN_LABELS[col]}</span>
                <span>{grouped[col].length}</span>
              </div>
              <div className="kanban-col-body">
                {grouped[col].map((m) => (
                  <div className="kanban-card" key={m.id} onClick={() => setDetalheItem(m)} style={{ cursor: 'pointer' }}>
                    <div className="os-num">{m.os}</div>
                    <div className="titulo">{m.titulo}</div>
                    <div className="meta">
                      <span>{vinculoLabel(m)}</span>
                      <span>{formatDate(m.data)}</span>
                    </div>
                    <div className="move-actions" onClick={(e) => e.stopPropagation()}>
                      {COLUMNS.filter((c) => c !== col).map((c) => (
                        <button key={c} className="btn btn-sm" onClick={() => moveStatus(m, c)}>
                          → {COLUMN_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {grouped[col].length === 0 && <div className="text-muted" style={{ fontSize: 12, padding: '8px 4px' }}>Sem ordens nesta coluna.</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && manutencoes.length > 0 && view === 'lista' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>OS</th><th>Rádio / Frota</th><th>Título</th><th>Tipo</th><th>Técnico</th><th>Data</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {manutencoes.map((m) => (
                <tr key={m.id} onClick={() => setDetalheItem(m)} style={{ cursor: 'pointer' }}>
                  <td className="mono" style={{ color: 'var(--accent)' }}>{m.os}</td>
                  <td className="mono">{vinculoLabel(m)}</td>
                  <td>{m.titulo}</td>
                  <td>{m.tipo}</td>
                  <td>{m.tecnico || '—'}</td>
                  <td>{formatDate(m.data)}</td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Nova ordem de serviço" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field full">
                <label>Abrir OS por *</label>
                <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
                  <div className={`tab ${form.modo === 'radio' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, modo: 'radio' }))}>Rádio</div>
                  <div className={`tab ${form.modo === 'frota' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, modo: 'frota' }))}>Frota</div>
                </div>
              </div>

              {form.modo === 'radio' && (
                <div className="field full">
                  <label>Rádio *</label>
                  <input className="input" placeholder="Buscar por nº de série ou modelo…" value={radioSearch} onChange={(e) => setRadioSearch(e.target.value)} />
                  <select className="input" required style={{ marginTop: 6 }} value={form.radioId} onChange={(e) => setForm((f) => ({ ...f, radioId: e.target.value }))}>
                    <option value="">Selecione o rádio</option>
                    {radiosOptions.map((r) => (
                      <option key={r.id} value={r.id}>{r.modelo || 'Rádio'} · {r.numeroSerie}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.modo === 'frota' && (
                <div className="field full">
                  <label>Frota *</label>
                  <select className="input" required value={form.frotaId} onChange={(e) => setForm((f) => ({ ...f, frotaId: e.target.value }))}>
                    <option value="">Selecione a frota</option>
                    {frotas.filter((f) => f.ativo || String(f.id) === String(form.frotaId)).map((f) => (
                      <option key={f.id} value={f.id}>{f.numero} · {f.nome}</option>
                    ))}
                  </select>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Use quando o defeito ainda não foi isolado a um rádio específico.
                  </p>
                </div>
              )}

              <div className="field full">
                <label>Informar defeito *</label>
                <textarea className="input" rows={2} required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="field">
                <label>Tipo *</label>
                <select className="input" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="Corretiva">Corretiva</option>
                  <option value="Preventiva">Preventiva</option>
                </select>
              </div>
              <div className="field">
                <label>Técnico</label>
                <input className="input" value={form.tecnico} onChange={(e) => setForm((f) => ({ ...f, tecnico: e.target.value }))} />
              </div>
              <div className="field">
                <label>Data</label>
                <input type="date" className="input" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Descrição</label>
                <textarea className="input" rows={3} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Abrir OS'}</button>
            </div>
          </form>
        </Modal>
      )}

      {detalheItem && (
        <Modal title={`OS ${detalheItem.os}`} onClose={() => setDetalheItem(null)}>
          <div className="form-grid">
            <div className="field">
              <label>Status</label>
              <div><StatusBadge status={detalheItem.status} /></div>
            </div>
            <div className="field">
              <label>Tipo</label>
              <div>{detalheItem.tipo}</div>
            </div>
            <div className="field full">
              <label>{detalheItem.radio ? 'Rádio' : 'Frota'}</label>
              <div>{vinculoLabel(detalheItem)}</div>
            </div>
            <div className="field full">
              <label>Defeito informado</label>
              <div>{detalheItem.titulo}</div>
            </div>
            {detalheItem.descricao && (
              <div className="field full">
                <label>Descrição</label>
                <div>{detalheItem.descricao}</div>
              </div>
            )}
            <div className="field">
              <label>Técnico</label>
              <div>{detalheItem.tecnico || '—'}</div>
            </div>
            <div className="field">
              <label>Data</label>
              <div>{formatDate(detalheItem.data)}</div>
            </div>
            <div className="field full">
              <label>Insumos utilizados</label>
              <div>{detalheItem.insumos?.length ? detalheItem.insumos.map((i) => i.nome).join(', ') : '—'}</div>
            </div>
            <div className="field">
              <label>Criada em</label>
              <div className="text-muted" style={{ fontSize: 12.5 }}>{formatDateTime(detalheItem.createdAt)}</div>
            </div>
            <div className="field">
              <label>Atualizada em</label>
              <div className="text-muted" style={{ fontSize: 12.5 }}>{formatDateTime(detalheItem.updatedAt)}</div>
            </div>
          </div>
        </Modal>
      )}

      {confirmMove && (
        <ConfirmDialog
          title="Mover ordem de serviço"
          message={`Mover ${confirmMove.item.os} para "${COLUMN_LABELS[confirmMove.status]}"?`}
          confirmLabel="Mover"
          confirmDisabled={precisaInsumo && confirmMove.insumoIds.length === 0}
          onConfirm={handleConfirmMove}
          onCancel={() => setConfirmMove(null)}
        >
          {precisaInsumo && (
            <div className="field full" style={{ marginTop: 12 }}>
              <label>Insumos utilizados * (selecione um ou mais)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {insumos.filter((i) => i.ativo).map((i) => (
                  <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 400, textTransform: 'none' }}>
                    <input
                      type="checkbox"
                      checked={confirmMove.insumoIds.includes(i.id)}
                      onChange={() => toggleInsumo(i.id)}
                    />
                    {i.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
