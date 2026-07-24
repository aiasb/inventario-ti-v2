import { useMemo, useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';

function emptyForm() {
  return { matricula: '', nome: '', funcao: '', departamento: '', ativo: true };
}

export function Colaboradores() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [showFiltro, setShowFiltro] = useState(false);
  const [departamentoFiltro, setDepartamentoFiltro] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, loading, reload } = useFetch('/colaboradores', { limit: 300, sort: 'nome' });
  const colaboradores = data?.data || [];

  const departamentos = useMemo(() => {
    const set = new Set(colaboradores.map((c) => c.departamento).filter(Boolean));
    return [...set].sort();
  }, [colaboradores]);

  const listaFiltrada = useMemo(() => {
    const q = query.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (departamentoFiltro && c.departamento !== departamentoFiltro) return false;
      if (!q) return true;
      return (
        (c.matricula || '').toLowerCase().includes(q) ||
        c.nome.toLowerCase().includes(q) ||
        (c.funcao || '').toLowerCase().includes(q) ||
        (c.departamento || '').toLowerCase().includes(q)
      );
    });
  }, [colaboradores, query, departamentoFiltro]);

  usePageHeader({
    breadcrumb: 'Geotecnologia / Colaboradores',
    title: 'Consulta de Colaboradores',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Novo Colaborador
      </button>
    ),
  });

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setForm({
      matricula: c.matricula || '', nome: c.nome, funcao: c.funcao || '', departamento: c.departamento || '', ativo: c.ativo,
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
        await api.put(`/colaboradores/${editingId}`, payload);
        toast('Colaborador atualizado.');
      } else {
        await api.post('/colaboradores', payload);
        toast('Colaborador cadastrado.');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const c = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/colaboradores/${c.id}`);
      toast('Colaborador excluído.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <input
            className="input"
            placeholder="Pesquise por matrícula, nome, função ou departamento"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className={`btn btn-sm${showFiltro ? ' btn-primary' : ''}`} onClick={() => setShowFiltro((v) => !v)}>
          <Icon name="filter" size={14} />
        </button>
      </div>

      {showFiltro && (
        <div className="filters-bar" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Departamento</label>
            <select className="input" value={departamentoFiltro} onChange={(e) => setDepartamentoFiltro(e.target.value)}>
              <option value="">Todos</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {departamentoFiltro && (
            <button className="btn btn-ghost btn-sm" onClick={() => setDepartamentoFiltro('')} style={{ alignSelf: 'flex-end' }}>
              <Icon name="x" size={13} /> Limpar
            </button>
          )}
        </div>
      )}

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && listaFiltrada.length === 0 && (
        <div className="empty-state"><p>Nenhum colaborador encontrado.</p></div>
      )}

      {!loading && listaFiltrada.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Matrícula</th><th>Nome</th><th>Função</th><th>Departamento</th>
                <th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((c) => (
                <tr key={c.id}>
                  <td className="mono text-secondary">{c.matricula || '—'}</td>
                  <td>{c.nome}</td>
                  <td className="text-secondary">{c.funcao || '—'}</td>
                  <td className="text-secondary">{c.departamento || '—'}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm" title="Editar" onClick={() => openEdit(c)}>
                        <Icon name="edit" size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" title="Excluir" onClick={() => setConfirmDelete(c)}>
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editingId ? 'Editar colaborador' : 'Novo colaborador'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field">
                <label>Matrícula</label>
                <input className="input" value={form.matricula} onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))} />
              </div>
              <div className="field">
                <label>Nome *</label>
                <input className="input" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field">
                <label>Função</label>
                <input className="input" value={form.funcao} onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value }))} />
              </div>
              <div className="field">
                <label>Departamento</label>
                <input className="input" value={form.departamento} onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))} />
              </div>
              {editingId && (
                <div className="field full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none' }}>
                    <input type="checkbox" className="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} />
                    Ativo
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir colaborador"
          message={`Excluir ${confirmDelete.nome}? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
