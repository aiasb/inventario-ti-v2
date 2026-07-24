import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, radioTipoLabel } from '../utils/format.js';

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
    fields: [
      { name: 'nome', label: 'Nome', required: true },
      { name: 'sigla', label: 'Sigla', required: false },
    ],
    columns: [
      { key: 'sigla', label: 'Sigla' },
      { key: 'nome', label: 'Nome' },
    ],
  },
  {
    // Não usa o CadastroTable genérico — tem busca, filtro e coluna
    // calculada (rádios alocados), então é renderizado à parte (ver
    // ResponsaveisTab abaixo).
    key: 'responsaveis', label: 'Responsáveis',
  },
  {
    // Idem — busca multi-campo e coluna calculada "Quantidade de rádios"
    // (ver ModelosTab abaixo). Independente do campo texto radios.modelo —
    // a contagem compara por nome (correspondência aproximada).
    key: 'modelos', label: 'Modelos',
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
      {tab.key === 'responsaveis' && <ResponsaveisTab />}
      {tab.key === 'modelos' && <ModelosTab />}
      {tab.key !== 'responsaveis' && tab.key !== 'modelos' && <CadastroTable tab={tab} />}
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

function emptyResponsavelForm() {
  return {
    nome: '', matricula: '', setor: '', legenda: '', areaId: '', ativo: true,
  };
}

function ResponsaveisTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyResponsavelForm());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [showFiltro, setShowFiltro] = useState(false);
  const [areaFiltro, setAreaFiltro] = useState('');

  const areasGeo = useLookup('/areas-geo');
  const { data, loading, reload } = useFetch('/responsaveis-geo', { limit: 200, sort: 'nome' });
  const responsaveis = data?.data || [];

  const { data: radiosData } = useFetch('/radios', { limit: 500 });
  const radios = radiosData?.data || [];

  const radiosPorResponsavel = useMemo(() => {
    const map = new Map();
    for (const r of radios) {
      if (!r.responsavel) continue;
      map.set(r.responsavel.id, (map.get(r.responsavel.id) || 0) + 1);
    }
    return map;
  }, [radios]);

  // A coluna/filtro "Área" mostra a sigla cadastrada em Cadastros > Áreas
  // (não o nome completo) — cai para o nome só se a área não tiver sigla.
  function areaSigla(id) {
    const area = areasGeo.find((a) => String(a.id) === String(id));
    if (!area) return '';
    return area.sigla || area.nome || '';
  }

  const listaFiltrada = useMemo(() => {
    const q = query.trim().toLowerCase();
    return responsaveis.filter((r) => {
      if (areaFiltro && String(r.areaId) !== String(areaFiltro)) return false;
      if (!q) return true;
      const area = areaSigla(r.areaId).toLowerCase();
      return (
        r.nome.toLowerCase().includes(q) ||
        (r.setor || '').toLowerCase().includes(q) ||
        area.includes(q) ||
        (r.legenda || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responsaveis, query, areaFiltro, areasGeo]);

  function openNew() {
    setEditingId(null);
    setForm(emptyResponsavelForm());
    setShowForm(true);
  }

  function openEdit(r) {
    setEditingId(r.id);
    setForm({
      nome: r.nome, matricula: r.matricula || '', setor: r.setor || '', legenda: r.legenda || '',
      areaId: r.areaId || '', ativo: r.ativo,
    });
    setShowForm(true);
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

  return (
    <div>
      <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <input
            className="input"
            placeholder="Pesquise por nome, setor, área ou legenda"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className={`btn btn-sm${showFiltro ? ' btn-primary' : ''}`} onClick={() => setShowFiltro((v) => !v)}>
          <Icon name="filter" size={14} />
        </button>
        <button className="btn btn-primary" onClick={openNew}>
          <Icon name="plus" size={15} /> Novo Responsável
        </button>
      </div>

      {showFiltro && (
        <div className="filters-bar" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Área</label>
            <select className="input" value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)}>
              <option value="">Todas</option>
              {areasGeo.map((a) => (
                <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} · ${a.nome}` : a.nome}</option>
              ))}
            </select>
          </div>
          {areaFiltro && (
            <button className="btn btn-ghost btn-sm" onClick={() => setAreaFiltro('')} style={{ alignSelf: 'flex-end' }}>
              <Icon name="x" size={13} /> Limpar
            </button>
          )}
        </div>
      )}

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && listaFiltrada.length === 0 && (
        <div className="empty-state"><p>Nenhum responsável encontrado.</p></div>
      )}

      {!loading && listaFiltrada.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome do responsável</th><th>Setor</th><th>Área</th><th>Legenda</th>
                <th>Rádios alocados</th><th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((r) => {
                const count = radiosPorResponsavel.get(r.id) || 0;
                return (
                  <tr key={r.id}>
                    <td>{r.nome}</td>
                    <td className="text-secondary">{r.setor || '—'}</td>
                    <td className="text-secondary">{areaSigla(r.areaId) || '—'}</td>
                    <td className="mono" style={{ color: 'var(--accent)' }}>{r.legenda || '—'}</td>
                    <td>
                      <Link to={`/radios?responsavelId=${r.id}`} className="mono" style={{ color: 'var(--accent)' }}>
                        {count} rádio{count === 1 ? '' : 's'} ↗
                      </Link>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-sm" title="Editar" onClick={() => openEdit(r)}>
                          <Icon name="edit" size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Excluir" onClick={() => remove(r)}>
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                <label>Setor</label>
                <input className="input" value={form.setor} onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))} />
              </div>
              <div className="field">
                <label>Legenda</label>
                <input className="input" placeholder="Ex.: IN" value={form.legenda} onChange={(e) => setForm((f) => ({ ...f, legenda: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Área</label>
                <select className="input" value={form.areaId} onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}>
                  <option value="">—</option>
                  {areasGeo.filter((a) => a.ativo || String(a.id) === String(form.areaId)).map((a) => (
                    <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} · ` : ''}{a.nome}{!a.ativo ? ' (inativa)' : ''}</option>
                  ))}
                </select>
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
    </div>
  );
}

function emptyModeloForm() {
  return { codigoChb: '', nome: '', serial: '', tipo: '', valor: '', ativo: true };
}

function ModelosTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyModeloForm());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [showFiltro, setShowFiltro] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState('');

  const { data, loading, reload } = useFetch('/modelos-radio', { limit: 200, sort: 'nome' });
  const modelos = data?.data || [];

  const { data: radiosData } = useFetch('/radios', { limit: 500 });
  const radios = radiosData?.data || [];

  // "Quantidade de rádios" compara o texto de radios.modelo com o nome
  // cadastrado aqui (sem FK — não há vínculo entre as duas tabelas).
  const radiosPorModelo = useMemo(() => {
    const map = new Map();
    for (const r of radios) {
      if (!r.modelo) continue;
      const key = r.modelo.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [radios]);

  function quantidadeFor(nome) {
    return radiosPorModelo.get((nome || '').trim().toLowerCase()) || 0;
  }

  const listaFiltrada = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modelos.filter((m) => {
      if (tipoFiltro && m.tipo !== tipoFiltro) return false;
      if (!q) return true;
      return (
        (m.codigoChb || '').toLowerCase().includes(q) ||
        m.nome.toLowerCase().includes(q) ||
        (m.serial || '').toLowerCase().includes(q) ||
        radioTipoLabel(m.tipo).toLowerCase().includes(q) ||
        String(m.valor || '').toLowerCase().includes(q)
      );
    });
  }, [modelos, query, tipoFiltro]);

  function openNew() {
    setEditingId(null);
    setForm(emptyModeloForm());
    setShowForm(true);
  }

  function openEdit(m) {
    setEditingId(m.id);
    setForm({
      codigoChb: m.codigoChb || '', nome: m.nome, serial: m.serial || '',
      tipo: m.tipo || '', valor: m.valor || '', ativo: m.ativo,
    });
    setShowForm(true);
  }

  async function remove(m) {
    try {
      await api.delete(`/modelos-radio/${m.id}`);
      toast('Modelo removido.');
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
        await api.put(`/modelos-radio/${editingId}`, payload);
        toast('Modelo atualizado.');
      } else {
        await api.post('/modelos-radio', payload);
        toast('Modelo cadastrado.');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <input
            className="input"
            placeholder="Pesquise por código, nome, serial, tipo ou valor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className={`btn btn-sm${showFiltro ? ' btn-primary' : ''}`} onClick={() => setShowFiltro((v) => !v)}>
          <Icon name="filter" size={14} />
        </button>
        <button className="btn btn-primary" onClick={openNew}>
          <Icon name="plus" size={15} /> Novo Modelo
        </button>
      </div>

      {showFiltro && (
        <div className="filters-bar" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Tipo</label>
            <select className="input" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="Movel">Móvel</option>
              <option value="Portatil">Portátil</option>
            </select>
          </div>
          {tipoFiltro && (
            <button className="btn btn-ghost btn-sm" onClick={() => setTipoFiltro('')} style={{ alignSelf: 'flex-end' }}>
              <Icon name="x" size={13} /> Limpar
            </button>
          )}
        </div>
      )}

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && listaFiltrada.length === 0 && (
        <div className="empty-state"><p>Nenhum modelo encontrado.</p></div>
      )}

      {!loading && listaFiltrada.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código do CHB</th><th>Nome</th><th>Serial</th><th>Tipo</th><th>Valor</th>
                <th>Quantidade de rádios</th><th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((m) => {
                const count = quantidadeFor(m.nome);
                return (
                  <tr key={m.id}>
                    <td className="mono">{m.codigoChb || '—'}</td>
                    <td>{m.nome}</td>
                    <td className="mono">{m.serial || '—'}</td>
                    <td>{radioTipoLabel(m.tipo) || '—'}</td>
                    <td>{m.valor != null && m.valor !== '' ? formatCurrency(m.valor) : '—'}</td>
                    <td>
                      <Link to={`/radios?modelo=${encodeURIComponent(m.nome)}`} className="mono" style={{ color: 'var(--accent)' }}>
                        {count} rádio{count === 1 ? '' : 's'} ↗
                      </Link>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-sm" title="Editar" onClick={() => openEdit(m)}>
                          <Icon name="edit" size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Excluir" onClick={() => remove(m)}>
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={editingId ? 'Editar modelo' : 'Novo modelo'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field">
                <label>Código do CHB</label>
                <input className="input" value={form.codigoChb} onChange={(e) => setForm((f) => ({ ...f, codigoChb: e.target.value }))} />
              </div>
              <div className="field">
                <label>Nome *</label>
                <input className="input" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field">
                <label>Serial</label>
                <input className="input" value={form.serial} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} />
              </div>
              <div className="field">
                <label>Tipo</label>
                <select className="input" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="">—</option>
                  <option value="Movel">Móvel</option>
                  <option value="Portatil">Portátil</option>
                </select>
              </div>
              <div className="field full">
                <label>Valor</label>
                <input
                  className="input" type="number" step="0.01" min="0"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                />
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
    </div>
  );
}
