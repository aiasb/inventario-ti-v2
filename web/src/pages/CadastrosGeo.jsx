import { useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';

const TABS = [
  {
    key: 'frotas', label: 'Frotas',
    fields: [
      { name: 'numero', label: 'Número', required: true },
      { name: 'nome', label: 'Nome', required: true },
    ],
    columns: [
      { key: 'numero', label: 'Número' },
      { key: 'nome', label: 'Nome' },
    ],
  },
  {
    key: 'areas-geo', label: 'Áreas',
    fields: [{ name: 'nome', label: 'Nome', required: true }],
    columns: [{ key: 'nome', label: 'Nome' }],
  },
  {
    // Compartilhado com TI (ver Cadastros.jsx) — mesma tabela status_ativo.
    key: 'status-ativo', label: 'Status',
    fields: [{ name: 'nome', label: 'Nome', required: true }],
    columns: [{ key: 'nome', label: 'Nome' }],
  },
  {
    // Itens usados na manutenção de rádios — a OS passa a exigir a escolha
    // de um destes em vez de um título livre (ver ManutencoesRadios.jsx).
    key: 'insumos', label: 'Insumos',
    fields: [{ name: 'nome', label: 'Nome', required: true }],
    columns: [{ key: 'nome', label: 'Nome' }],
  },
  {
    // Usadas na Gestão de Ocorrências (envio de rádios para reparo externo).
    key: 'transportadoras', label: 'Transportadoras',
    fields: [
      { name: 'nome', label: 'Nome', required: true },
      { name: 'cnpj', label: 'CNPJ' },
      { name: 'telefone', label: 'Telefone' },
      { name: 'email', label: 'E-mail' },
    ],
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'telefone', label: 'Telefone' },
    ],
  },
  {
    // Fornecedor próprio da Geotecnologia — não é o mesmo cadastro de
    // Fornecedores de TI (ver Cadastros.jsx).
    key: 'fornecedores-geo', label: 'Fornecedores',
    fields: [
      { name: 'nome', label: 'Nome', required: true },
      { name: 'cnpj', label: 'CNPJ' },
      { name: 'telefone', label: 'Telefone' },
      { name: 'email', label: 'E-mail' },
    ],
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'telefone', label: 'Telefone' },
    ],
  },
];

export function CadastrosGeo() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const tab = TABS.find((t) => t.key === activeTab);

  usePageHeader({ breadcrumb: 'Geotecnologia / Cadastros', title: 'Cadastros (Geotecnologia)' });

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <div key={t.key} className={`tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>
      <CadastroTable tab={tab} />
    </div>
  );
}

function emptyFormFor(tab) {
  return tab.fields.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});
}

function CadastroTable({ tab }) {
  const { toast } = useToast();
  const { data, loading, reload } = useFetch(`/${tab.key}`, { limit: 100 }, [tab.key]);
  const items = data?.data || [];
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyFormFor(tab));
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditingId(null);
    setForm(emptyFormFor(tab));
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm(tab.fields.reduce((acc, f) => ({ ...acc, [f.name]: item[f.name] ?? '' }), {}));
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/${tab.key}/${editingId}`, form);
        toast('Registro atualizado.');
      } else {
        await api.post(`/${tab.key}`, form);
        toast('Registro criado.');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(item) {
    try {
      await api.put(`/${tab.key}/${item.id}`, { ativo: !item.ativo });
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(item) {
    try {
      await api.delete(`/${tab.key}/${item.id}`);
      toast('Registro removido.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-12">
        <span className="text-muted" style={{ fontSize: 12.5 }}>{items.length} registro(s)</span>
        <button className="btn btn-sm btn-primary" onClick={openNew}>
          <Icon name="plus" size={13} /> Novo
        </button>
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && items.length === 0 && <div className="empty-state"><p>Nenhum registro cadastrado.</p></div>}

      {!loading && items.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {tab.columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Ativo</th>
                <th style={{ width: 130 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {tab.columns.map((c) => <td key={c.key}>{item[c.key] || '—'}</td>)}
                  <td>
                    <input type="checkbox" className="checkbox" checked={item.ativo} onChange={() => toggleAtivo(item)} />
                  </td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm" onClick={() => openEdit(item)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(item)}>
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
        <Modal title={editingId ? `Editar ${tab.label}` : `Novo em ${tab.label}`} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              {tab.fields.map((f) => (
                <div className="field full" key={f.name}>
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  <input
                    className="input"
                    required={f.required}
                    value={form[f.name] || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  />
                </div>
              ))}
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
