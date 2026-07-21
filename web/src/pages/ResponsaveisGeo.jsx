import { useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';

function emptyForm() {
  return { nome: '', matricula: '', cpf: '', areaId: '' };
}

export function ResponsaveisGeo() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const areasGeo = useLookup('/areas-geo');
  const { data, loading, reload } = useFetch('/responsaveis-geo', { limit: 200, sort: 'nome' });
  const responsaveis = data?.data || [];

  usePageHeader({
    breadcrumb: 'Geotecnologia / Responsáveis',
    title: 'Responsáveis (Geotecnologia)',
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
      nome: r.nome, matricula: r.matricula || '', cpf: r.cpf || '', areaId: r.areaId || '',
    });
    setShowForm(true);
  }

  async function toggleAtivo(r) {
    try {
      await api.put(`/responsaveis-geo/${r.id}`, { ativo: !r.ativo });
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(r) {
    try {
      await api.delete(`/responsaveis-geo/${r.id}`);
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
        await api.put(`/responsaveis-geo/${editingId}`, payload);
        toast('Responsável atualizado.');
      } else {
        await api.post('/responsaveis-geo', payload);
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

  function areaNome(id) {
    return areasGeo.find((a) => String(a.id) === String(id))?.nome || '—';
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
                <th>Nome</th><th>Matrícula</th><th>CPF</th><th>Área</th>
                <th>Ativo</th><th style={{ width: 130 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {responsaveis.map((r) => (
                <tr key={r.id}>
                  <td>{r.nome}</td>
                  <td className="mono text-secondary">{r.matricula || '—'}</td>
                  <td className="mono text-secondary">{r.cpf || '—'}</td>
                  <td className="text-secondary">{areaNome(r.areaId)}</td>
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
                <label>Área</label>
                <select className="input" value={form.areaId} onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}>
                  <option value="">—</option>
                  {areasGeo.filter((a) => a.ativo || String(a.id) === String(form.areaId)).map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}{!a.ativo ? ' (inativa)' : ''}</option>
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
