import { useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime } from '../utils/format.js';

export function Configuracoes() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [newToken, setNewToken] = useState(null);

  const { data, loading, reload } = useFetch('/api-tokens', {});
  const tokens = data?.data || [];

  usePageHeader({ breadcrumb: 'Configuração / Configurações', title: 'Integrações & API' });

  const apiBaseUrl = `${window.location.origin}/api/v1`;
  const swaggerUrl = `${window.location.origin}/api/docs`;

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post('/api-tokens', { nome });
      setNewToken(created.token);
      setNome('');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function revoke(token) {
    try {
      await api.patch(`/api-tokens/${token.id}/revoke`, {});
      toast('Token revogado.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
    toast('Copiado para a área de transferência.');
  }

  return (
    <div>
      <div className="panel mb-16">
        <div className="panel-header">
          <h3>Acesso à API (uso do futuro app Android)</h3>
        </div>
        <div className="panel-body">
          <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="detail-field">
              <div className="label-caps">URL base da API</div>
              <div className="flex items-center gap-8" style={{ marginTop: 4 }}>
                <code className="mono value" style={{ color: 'var(--accent)' }}>{apiBaseUrl}</code>
                <button className="btn btn-sm" onClick={() => copy(apiBaseUrl)}>Copiar</button>
              </div>
            </div>
            <div className="detail-field" style={{ marginTop: 14 }}>
              <div className="label-caps">Documentação (Swagger / OpenAPI)</div>
              <div style={{ marginTop: 4 }}>
                <a href={swaggerUrl} target="_blank" rel="noreferrer">{swaggerUrl}</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-12">
        <span className="section-title" style={{ marginBottom: 0 }}>Tokens de acesso</span>
        <button className="btn btn-sm btn-primary" onClick={() => { setNewToken(null); setShowForm(true); }}>
          <Icon name="key" size={13} /> Novo token
        </button>
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && tokens.length === 0 && (
        <div className="empty-state"><p>Nenhum token de API gerado ainda.</p></div>
      )}

      {!loading && tokens.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Nome</th><th>Prefixo</th><th>Último uso</th><th>Criado em</th><th>Status</th><th style={{ width: 90 }}>Ações</th></tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td>{t.nome}</td>
                  <td className="mono text-secondary">{t.tokenPrefix}…</td>
                  <td className="text-muted">{t.ultimoUso ? formatDateTime(t.ultimoUso) : 'nunca usado'}</td>
                  <td className="text-muted">{formatDateTime(t.createdAt)}</td>
                  <td>
                    <span className={`badge ${t.revoked ? 'badge-baixado' : 'badge-ativo'}`}>{t.revoked ? 'Revogado' : 'Ativo'}</span>
                  </td>
                  <td>
                    {!t.revoked && (
                      <button className="btn btn-sm btn-danger" onClick={() => revoke(t)}>Revogar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Novo token de API" onClose={() => setShowForm(false)}>
          {!newToken ? (
            <form onSubmit={handleCreate}>
              <div className="field full">
                <label>Nome / descrição *</label>
                <input className="input" required placeholder="Ex: App Android - Coleta de inventário" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Gerando…' : 'Gerar token'}</button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-secondary" style={{ fontSize: 13 }}>
                Copie o token agora — por segurança, ele não será exibido novamente.
              </p>
              <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
                <code className="mono" style={{ wordBreak: 'break-all', color: 'var(--accent)', fontSize: 12.5 }}>{newToken}</code>
              </div>
              <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
                <button className="btn" onClick={() => copy(newToken)}>Copiar</button>
                <button className="btn btn-primary" onClick={() => setShowForm(false)}>Concluir</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
