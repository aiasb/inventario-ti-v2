import { useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime, initials } from '../utils/format.js';

const TABS = [
  { key: 'usuarios', label: 'Usuários' },
  { key: 'perfis', label: 'Perfis de acesso' },
];

const MODULOS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inventario', label: 'Inventário' },
  { key: 'manutencoes', label: 'Manutenções' },
  { key: 'termos', label: 'Termos' },
  { key: 'responsaveis', label: 'Responsáveis' },
  { key: 'acessos', label: 'Acessos' },
  { key: 'cadastros', label: 'Cadastros' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'radios', label: 'Rádios (Geo)' },
  { key: 'manutencoesRadios', label: 'Manutenções (Geo)' },
  { key: 'responsaveisGeo', label: 'Responsáveis (Geo)' },
  { key: 'cadastrosGeo', label: 'Cadastros (Geo)' },
];

const ACOES = [
  { key: 'podeVer', label: 'Ver' },
  { key: 'podeCriar', label: 'Criar' },
  { key: 'podeEditar', label: 'Editar' },
  { key: 'podeExcluir', label: 'Excluir' },
];

export function Acessos() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <div key={t.key} className={`tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>
      {activeTab === 'usuarios' ? <UsuariosTab /> : <PerfisTab />}
    </div>
  );
}

function emptyUsuarioForm() {
  return { nome: '', email: '', senha: '', cargo: '', perfilId: '', empresaIds: [] };
}

function UsuariosTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyUsuarioForm());
  const [saving, setSaving] = useState(false);
  const [tempSenha, setTempSenha] = useState(null);

  const { data, loading, reload } = useFetch('/usuarios', { limit: 100, sort: 'nome' });
  const usuarios = data?.data || [];
  const { data: perfisData } = useFetch('/perfis', {});
  const perfis = perfisData?.data || [];
  const { data: empresasData } = useFetch('/empresas', {});
  const empresas = empresasData?.data || [];

  function openNew() {
    setEditingId(null);
    setForm({
      ...emptyUsuarioForm(),
      perfilId: perfis.find((p) => p.nome === 'Consulta')?.id || perfis[0]?.id || '',
      empresaIds: empresas.filter((e) => e.slug === 'ti').map((e) => e.id),
    });
    setShowForm(true);
  }

  function toggleEmpresa(empresaId) {
    setForm((f) => ({
      ...f,
      empresaIds: f.empresaIds.includes(empresaId)
        ? f.empresaIds.filter((id) => id !== empresaId)
        : [...f.empresaIds, empresaId],
    }));
  }

  usePageHeader({
    breadcrumb: 'Configuração / Acessos',
    title: 'Acessos',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Novo usuário
      </button>
    ),
  });

  function openEdit(u) {
    setEditingId(u.id);
    setForm({
      nome: u.nome, email: u.email, senha: '', cargo: u.cargo || '', perfilId: u.perfilId || '',
      empresaIds: (u.empresas || []).map((e) => e.id),
    });
    setShowForm(true);
  }

  async function toggleAtivo(u) {
    try {
      await api.patch(`/usuarios/${u.id}/status`, { ativo: !u.ativo });
      toast(`Usuário ${u.ativo ? 'desativado' : 'ativado'}.`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function toggleBloqueado(u) {
    try {
      await api.patch(`/usuarios/${u.id}/bloqueio`, { bloqueado: !u.bloqueado });
      toast(u.bloqueado ? 'Conta desbloqueada.' : 'Conta bloqueada.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function resetarSenha(u) {
    if (!window.confirm(`Gerar uma nova senha temporária para ${u.nome}? A senha atual deixará de funcionar.`)) return;
    try {
      const res = await api.post(`/usuarios/${u.id}/resetar-senha`, {});
      setTempSenha({ usuario: u, senha: res.senhaTemporaria });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(u) {
    if (!window.confirm(`Excluir o usuário ${u.nome}? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/usuarios/${u.id}`);
      toast('Usuário excluído.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
    toast('Copiado para a área de transferência.');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, perfilId: form.perfilId || undefined };
      if (editingId && !payload.senha) delete payload.senha;
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        toast('Usuário atualizado.');
      } else {
        await api.post('/usuarios', payload);
        toast('Usuário criado.');
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
      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && usuarios.length === 0 && (
        <div className="empty-state"><p>Nenhum usuário cadastrado.</p></div>
      )}

      {!loading && usuarios.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Empresas</th><th>Último acesso</th><th>Status</th>
                <th style={{ width: 300 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-8">
                      <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(u.nome)}</div>
                      <div>
                        <div>{u.nome}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{u.cargo || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono text-secondary">{u.email}</td>
                  <td>{u.perfil}</td>
                  <td>
                    <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                      {(u.empresas || []).length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>—</span>}
                      {(u.empresas || []).map((e) => (
                        <span key={e.id} className="badge badge-ativo">{e.nome}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted">{u.ultimoAcesso ? formatDateTime(u.ultimoAcesso) : 'nunca acessou'}</td>
                  <td>
                    <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                      <span className={`badge ${u.ativo ? 'badge-ativo' : 'badge-baixado'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                      {u.bloqueado && <span className="badge badge-manutencao">Bloqueado</span>}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => openEdit(u)}>Editar</button>
                      <button className="btn btn-sm" onClick={() => resetarSenha(u)}>
                        <Icon name="key" size={13} /> Resetar senha
                      </button>
                      <button className="btn btn-sm" onClick={() => toggleAtivo(u)}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button className="btn btn-sm" onClick={() => toggleBloqueado(u)}>
                        {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(u)}>
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
        <Modal title={editingId ? 'Editar usuário' : 'Novo usuário'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field full">
                <label>Nome *</label>
                <input className="input" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field full">
                <label>E-mail *</label>
                <input type="email" className="input" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="field">
                <label>{editingId ? 'Nova senha (opcional)' : 'Senha inicial *'}</label>
                <input
                  type="password"
                  className="input"
                  required={!editingId}
                  placeholder={editingId ? 'Deixe em branco para manter' : ''}
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Perfil</label>
                <select className="input" value={form.perfilId} onChange={(e) => setForm((f) => ({ ...f, perfilId: e.target.value }))}>
                  {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="field full">
                <label>Cargo</label>
                <input className="input" value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Empresas que pode acessar</label>
                <div className="flex gap-16" style={{ marginTop: 4 }}>
                  {empresas.map((e) => (
                    <label key={e.id} className="flex items-center gap-8" style={{ fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={form.empresaIds.includes(e.id)}
                        onChange={() => toggleEmpresa(e.id)}
                      />
                      {e.nome}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar usuário'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {tempSenha && (
        <Modal title="Senha temporária gerada" onClose={() => setTempSenha(null)}>
          <p className="text-secondary" style={{ fontSize: 13 }}>
            Copie a senha abaixo e informe a <strong>{tempSenha.usuario.nome}</strong> por um canal seguro — ela não
            será exibida novamente. Recomende que o usuário a troque no próximo acesso.
          </p>
          <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
            <code className="mono" style={{ fontSize: 15, color: 'var(--accent)' }}>{tempSenha.senha}</code>
          </div>
          <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
            <button className="btn" onClick={() => copy(tempSenha.senha)}>Copiar</button>
            <button className="btn btn-primary" onClick={() => setTempSenha(null)}>Concluir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function emptyPermissoes() {
  return MODULOS.reduce((acc, m) => {
    acc[m.key] = { podeVer: false, podeCriar: false, podeEditar: false, podeExcluir: false };
    return acc;
  }, {});
}

function emptyPerfilForm() {
  return { nome: '', descricao: '', permissoes: emptyPermissoes() };
}

function PerfisTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyPerfilForm());
  const [saving, setSaving] = useState(false);

  const { data, loading, reload } = useFetch('/perfis', {});
  const perfis = data?.data || [];

  function openNew() {
    setEditingId(null);
    setForm(emptyPerfilForm());
    setShowForm(true);
  }

  usePageHeader({
    breadcrumb: 'Configuração / Acessos',
    title: 'Acessos',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Novo perfil
      </button>
    ),
  });

  function openEdit(p) {
    setEditingId(p.id);
    const permissoes = emptyPermissoes();
    for (const m of MODULOS) {
      if (p.permissoes?.[m.key]) permissoes[m.key] = { ...p.permissoes[m.key] };
    }
    setForm({ nome: p.nome, descricao: p.descricao || '', permissoes });
    setShowForm(true);
  }

  function toggleCell(modulo, acao) {
    setForm((f) => ({
      ...f,
      permissoes: {
        ...f.permissoes,
        [modulo]: { ...f.permissoes[modulo], [acao]: !f.permissoes[modulo][acao] },
      },
    }));
  }

  async function remove(p) {
    if (!window.confirm(`Excluir o perfil "${p.nome}"? Usuários com esse perfil ficarão sem acesso até serem reatribuídos.`)) return;
    try {
      await api.delete(`/perfis/${p.id}`);
      toast('Perfil excluído.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/perfis/${editingId}`, form);
        toast('Perfil atualizado.');
      } else {
        await api.post('/perfis', form);
        toast('Perfil criado.');
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
      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && perfis.length === 0 && (
        <div className="empty-state"><p>Nenhum perfil cadastrado.</p></div>
      )}

      {!loading && perfis.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Perfil</th><th>Descrição</th><th style={{ width: 140 }}>Ações</th></tr>
            </thead>
            <tbody>
              {perfis.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td className="text-muted">{p.descricao || '—'}</td>
                  <td>
                    <div className="flex gap-8">
                      <button className="btn btn-sm" onClick={() => openEdit(p)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
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
        <Modal title={editingId ? 'Editar perfil' : 'Novo perfil'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field full">
                <label>Nome *</label>
                <input className="input" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Descrição</label>
                <input className="input" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
              </div>
            </div>

            <div className="section-title" style={{ marginTop: 18 }}>Permissões por módulo</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Módulo</th>
                    {ACOES.map((a) => <th key={a.key} style={{ textAlign: 'center' }}>{a.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MODULOS.map((m) => (
                    <tr key={m.key}>
                      <td>{m.label}</td>
                      {ACOES.map((a) => (
                        <td key={a.key} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={!!form.permissoes[m.key]?.[a.key]}
                            onChange={() => toggleCell(m.key, a.key)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar perfil'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
