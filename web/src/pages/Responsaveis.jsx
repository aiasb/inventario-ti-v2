import { useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';

function emptyForm() {
  return { nome: '', matricula: '', cpf: '', setorId: '' };
}

export function Responsaveis() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const setores = useLookup('/setores');
  const { data, loading, reload } = useFetch('/responsaveis', { limit: 200, sort: 'nome' });
  const responsaveis = data?.data || [];

  usePageHeader({
    breadcrumb: 'Operação / Responsáveis',
    title: 'Responsáveis',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Novo responsável
      </button>
    ),
  });

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(r) {
    setEditingId(r.id);
    setForm({
      nome: r.nome, matricula: r.matricula || '', cpf: r.cpf || '', setorId: r.setorId || '',
    });
    setShowForm(true);
  }

  async function toggleAtivo(r) {
    try {
      await api.put(`/responsaveis/${r.id}`, { ativo: !r.ativo });
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(r) {
    try {
      await api.delete(`/responsaveis/${r.id}`);
      toast('Responsável removido.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
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
        await api.put(`/responsaveis/${editingId}`, payload);
        toast('Responsável atualizado.');
      } else {
        await api.post('/responsaveis', payload);
        toast('Responsável cadastrado.');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function setorNome(id) {
    return setores.find((s) => String(s.id) === String(id))?.nome || '—';
  }

  return (
    <div>
      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && responsaveis.length === 0 && (
        <div className="empty-state"><p>Nenhum responsável cadastrado.</p></div>
      )}

      {!loading && responsaveis.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th><th>Matrícula</th><th>CPF</th><th>Setor</th>
                <th>Ativo</th><th style={{ width: 130 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {responsaveis.map((r) => (
                <tr key={r.id}>
                  <td>{r.nome}</td>
                  <td className="mono text-secondary">{r.matricula || '—'}</td>
                  <td className="mono text-secondary">{r.cpf || '—'}</td>
                  <td className="text-secondary">{setorNome(r.setorId)}</td>
                  <td>
                    <input type="checkbox" className="checkbox" checked={r.ativo} onChange={() => toggleAtivo(r)} />
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm" onClick={() => openEdit(r)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>
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
        <Modal title={editingId ? 'Editar responsável' : 'Novo responsável'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field full">
                <label>Nome *</label>
                <input className="input" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field">
                <label>Matrícula</label>
                <input className="input" value={form.matricula} onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))} />
              </div>
              <div className="field">
                <label>CPF</label>
                <input className="input" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Setor</label>
                <select className="input" value={form.setorId} onChange={(e) => setForm((f) => ({ ...f, setorId: e.target.value }))}>
                  <option value="">—</option>
                  {setores.filter((s) => s.ativo || String(s.id) === String(form.setorId)).map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}{!s.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
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
