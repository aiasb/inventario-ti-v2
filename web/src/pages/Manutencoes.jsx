import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

const COLUMNS = ['Aberta', 'Em andamento', 'Concluida'];
const COLUMN_LABELS = { Aberta: 'Aberta', 'Em andamento': 'Em andamento', Concluida: 'Concluída' };

function emptyForm() {
  return { equipamentoId: '', titulo: '', tipo: 'Corretiva', tecnico: '', custo: '', descricao: '', data: '' };
}

export function Manutencoes() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('kanban');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [equipSearch, setEquipSearch] = useState('');

  const { data, loading, reload } = useFetch('/manutencoes', { limit: 100, sort: '-data' });
  const manutencoes = data?.data || [];

  const { data: equipData } = useFetch('/equipamentos', { q: equipSearch, limit: 20 }, [equipSearch]);
  const equipamentosOptions = equipData?.data || [];

  useEffect(() => {
    if (searchParams.get('nova') === '1') {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePageHeader({
    breadcrumb: 'Operação / Manutenções',
    title: 'Manutenções',
    action: (
      <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setShowForm(true); }}>
        <Icon name="plus" size={15} /> Nova OS
      </button>
    ),
  });

  async function moveStatus(id, status) {
    try {
      await api.patch(`/manutencoes/${id}/status`, { status });
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
      await api.post('/manutencoes', { ...form, custo: form.custo ? Number(form.custo) : 0 });
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
                  <div className="kanban-card" key={m.id}>
                    <div className="os-num">{m.os}</div>
                    <div className="titulo">{m.titulo}</div>
                    <div className="meta">
                      <span>{m.equipamento.patrimonio}</span>
                      <span>{formatDate(m.data)}</span>
                    </div>
                    <div className="move-actions">
                      {COLUMNS.filter((c) => c !== col).map((c) => (
                        <button key={c} className="btn btn-sm" onClick={() => moveStatus(m.id, c)}>
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
                <th>OS</th><th>Equipamento</th><th>Título</th><th>Tipo</th><th>Técnico</th><th>Custo</th><th>Data</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {manutencoes.map((m) => (
                <tr key={m.id}>
                  <td className="mono" style={{ color: 'var(--accent)' }}>{m.os}</td>
                  <td>{m.equipamento.patrimonio} <span className="text-muted mono" style={{ fontSize: 11 }}>{m.equipamento.serial}</span></td>
                  <td>{m.titulo}</td>
                  <td>{m.tipo}</td>
                  <td>{m.tecnico || '—'}</td>
                  <td className="mono">{formatCurrency(m.custo)}</td>
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
                <label>Equipamento *</label>
                <input className="input" placeholder="Buscar por serial, patrimônio ou modelo…" value={equipSearch} onChange={(e) => setEquipSearch(e.target.value)} />
                <select className="input" required style={{ marginTop: 6 }} value={form.equipamentoId} onChange={(e) => setForm((f) => ({ ...f, equipamentoId: e.target.value }))}>
                  <option value="">Selecione o equipamento</option>
                  {equipamentosOptions.map((e) => (
                    <option key={e.id} value={e.id}>{e.patrimonio} · {e.modelo} · {e.serial}</option>
                  ))}
                </select>
              </div>
              <div className="field full">
                <label>Título *</label>
                <input className="input" required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
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
                <label>Custo (R$)</label>
                <input type="number" step="0.01" className="input" value={form.custo} onChange={(e) => setForm((f) => ({ ...f, custo: e.target.value }))} />
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
    </div>
  );
}
