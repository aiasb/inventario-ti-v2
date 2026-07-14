import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { Drawer } from '../components/Drawer.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, initials } from '../utils/format.js';

const TABS = [
  { key: 'Todos', label: 'Todos', assinado: undefined },
  { key: 'Assinado', label: 'Assinado', assinado: true },
  { key: 'Pendente', label: 'Pendente', assinado: false },
];

function emptyForm() {
  return { colaborador: '', cargo: '', data: '', observacoes: '', modeloId: '', responsavelId: '', equipamentoIds: [] };
}

function emptyModeloForm() {
  return { nome: '', texto: '' };
}

export function Termos() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [equipSearch, setEquipSearch] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [showModelos, setShowModelos] = useState(false);

  const modelos = useLookup('/termo-modelos');
  const responsaveis = useLookup('/responsaveis');
  const activeTab = TABS.find((t) => t.key === tab);
  const { data, loading, reload } = useFetch('/termos', { limit: 100, sort: '-data', assinado: activeTab.assinado });
  const termos = data?.data || [];

  const { data: allData } = useFetch('/termos', { limit: 1 });
  const { data: assinadoData } = useFetch('/termos', { limit: 1, assinado: true });
  const { data: pendenteData } = useFetch('/termos', { limit: 1, assinado: false });
  const counts = {
    Todos: allData?.meta?.total ?? 0,
    Assinado: assinadoData?.meta?.total ?? 0,
    Pendente: pendenteData?.meta?.total ?? 0,
  };

  const { data: equipData } = useFetch('/equipamentos', { q: equipSearch, limit: 20 }, [equipSearch]);
  const equipOptions = equipData?.data || [];

  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      setForm(emptyForm());
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePageHeader({
    breadcrumb: 'Operação / Termos',
    title: 'Termos de responsabilidade',
    action: (
      <div className="flex gap-8">
        <button className="btn" onClick={() => setShowModelos(true)}>Modelos de termo</button>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setShowForm(true); }}>
          <Icon name="plus" size={15} /> Novo termo
        </button>
      </div>
    ),
  });

  function toggleEquip(id) {
    setForm((f) => ({
      ...f,
      equipamentoIds: f.equipamentoIds.includes(id) ? f.equipamentoIds.filter((x) => x !== id) : [...f.equipamentoIds, id],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.modeloId) delete payload.modeloId;
      if (!payload.responsavelId) delete payload.responsavelId;
      await api.post('/termos', payload);
      toast('Termo de responsabilidade criado.');
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (printing) {
      const timer = setTimeout(() => window.print(), 150);
      const onAfter = () => setPrinting(null);
      window.addEventListener('afterprint', onAfter);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', onAfter);
      };
    }
  }, [printing]);

  return (
    <div>
      <div className="flex gap-8 mb-16">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && termos.length === 0 && (
        <div className="empty-state">
          <p>Nenhum termo {tab === 'Assinado' ? 'assinado' : tab === 'Pendente' ? 'pendente' : ''} encontrado.</p>
        </div>
      )}

      {!loading && termos.map((t) => (
        <div
          key={t.id}
          className="panel"
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', marginBottom: 10, cursor: 'pointer' }}
          onClick={() => setViewingId(t.id)}
        >
          <div className="user-avatar" style={{ width: 38, height: 38, flexShrink: 0 }}>{initials(t.colaborador)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.colaborador}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{t.cargo || '—'}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
              {t.equipamentos.map((eq) => eq.serial).join(' + ') || '—'}
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>entregue em {formatDate(t.data)}</div>
          </div>
          <span className={`badge ${t.assinado ? 'badge-ativo' : 'badge-manutencao'}`}>
            {t.assinado ? 'Assinado' : 'Pendente'}
          </span>
          <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setViewingId(t.id); }}>
            Visualizar termo
          </button>
        </div>
      ))}

      {viewingId && (
        <TermoDrawer
          id={viewingId}
          onClose={() => setViewingId(null)}
          onPrint={(t) => setPrinting(t)}
          onChanged={() => { reload(); }}
        />
      )}

      {printing && <PrintView termo={printing} />}

      {showForm && (
        <Modal title="Novo termo de responsabilidade" onClose={() => setShowForm(false)} width={620}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field">
                <label>Colaborador *</label>
                <input className="input" required value={form.colaborador} onChange={(e) => setForm((f) => ({ ...f, colaborador: e.target.value }))} />
              </div>
              <div className="field">
                <label>Cargo</label>
                <input className="input" value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
              </div>
              <div className="field">
                <label>Modelo do termo</label>
                <select className="input" value={form.modeloId} onChange={(e) => setForm((f) => ({ ...f, modeloId: e.target.value }))}>
                  <option value="">— Padrão —</option>
                  {modelos.filter((m) => m.ativo || String(m.id) === String(form.modeloId)).map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}{!m.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Responsável cadastrado (opcional)</label>
                <select className="input" value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}>
                  <option value="">— Nenhum —</option>
                  {responsaveis.filter((r) => r.ativo || String(r.id) === String(form.responsavelId)).map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}{!r.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
                <span className="text-muted" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Preenche %cpf%, %matricula% e %setor% no arquivo .docx.
                </span>
              </div>
              <div className="field">
                <label>Data</label>
                <input type="date" className="input" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Observações</label>
                <textarea className="input" rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Equipamentos * ({form.equipamentoIds.length} selecionado(s))</label>
                <input className="input" placeholder="Buscar equipamento…" value={equipSearch} onChange={(e) => setEquipSearch(e.target.value)} />
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 8, marginTop: 6 }}>
                  {equipOptions.map((eq) => (
                    <label key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border-soft)' }}>
                      <input type="checkbox" className="checkbox" checked={form.equipamentoIds.includes(eq.id)} onChange={() => toggleEquip(eq.id)} />
                      {eq.modelo} · <span className="mono text-muted">{eq.serial}</span>
                    </label>
                  ))}
                  {equipOptions.length === 0 && <div className="text-muted" style={{ padding: 10, fontSize: 12 }}>Nenhum equipamento encontrado.</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || form.equipamentoIds.length === 0}>
                {saving ? 'Salvando…' : 'Criar termo'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showModelos && <ModelosModal onClose={() => setShowModelos(false)} />}
    </div>
  );
}

function TermoDrawer({ id, onClose, onPrint, onChanged }) {
  const { data: termo, loading, reload } = useFetch(`/termos/${id}`, {}, [id]);
  const { toast } = useToast();
  const [toggling, setToggling] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState(false);
  const [docxReady, setDocxReady] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const docxContainerRef = useRef(null);

  useEffect(() => {
    setDocxReady(false);
    setDocxError(false);
    if (!termo?.modelo?.temArquivo) return;
    let active = true;
    setDocxLoading(true);
    api
      .getBlob(`/termos/${termo.id}/documento`)
      .then((blob) => {
        if (!active || !docxContainerRef.current) return;
        docxContainerRef.current.innerHTML = '';
        return renderAsync(blob, docxContainerRef.current, undefined, {
          inWrapper: true,
          hideWrapperOnPrint: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });
      })
      .then(() => { if (active) setDocxReady(true); })
      .catch(() => { if (active) setDocxError(true); })
      .finally(() => { if (active) setDocxLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo?.id, termo?.modelo?.temArquivo]);

  useEffect(() => {
    if (!printMode) return;
    const onAfter = () => setPrintMode(false);
    window.addEventListener('afterprint', onAfter);
    const timer = setTimeout(() => window.print(), 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', onAfter);
    };
  }, [printMode]);

  if (loading || !termo) {
    return (
      <Drawer title="Carregando…" onClose={onClose}>
        <div className="center-py"><div className="spinner" /></div>
      </Drawer>
    );
  }

  async function toggleAssinado() {
    setToggling(true);
    try {
      await api.patch(`/termos/${termo.id}/assinatura`, { assinado: !termo.assinado });
      toast(termo.assinado ? 'Termo marcado como pendente.' : 'Termo marcado como assinado.');
      reload();
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setToggling(false);
    }
  }

  async function baixarDocx() {
    try {
      await api.download(`/termos/${termo.id}/documento`, `${termo.numero}.docx`);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function handlePrintClick() {
    if (termo.modelo?.temArquivo && docxReady) {
      setPrintMode(true);
    } else {
      onPrint(termo);
    }
  }

  return (
    <Drawer
      title={termo.numero}
      subtitle={
        <div className="flex items-center gap-8">
          <span className="text-secondary">{termo.colaborador}</span>
          <span className={`badge ${termo.assinado ? 'badge-ativo' : 'badge-manutencao'}`}>
            {termo.assinado ? 'Assinado' : 'Pendente'}
          </span>
        </div>
      }
      onClose={onClose}
    >
      <div className="detail-grid">
        <div className="detail-field"><div className="label-caps">Cargo</div><div className="value">{termo.cargo || '—'}</div></div>
        <div className="detail-field"><div className="label-caps">Entregue em</div><div className="value">{formatDate(termo.data)}</div></div>
        <div className="detail-field"><div className="label-caps">Modelo do termo</div><div className="value">{termo.modelo?.nome || 'Padrão'}</div></div>
        <div className="detail-field"><div className="label-caps">Assinatura</div><div className="value">{termo.assinado ? formatDate(termo.dataAssinatura) : 'Pendente'}</div></div>
        {termo.responsavel && (
          <div className="detail-field">
            <div className="label-caps">Responsável vinculado</div>
            <div className="value">{termo.responsavel.nome}{termo.responsavel.cpf ? ` · ${termo.responsavel.cpf}` : ''}</div>
          </div>
        )}
      </div>

      <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={handlePrintClick}>
          <Icon name="print" size={13} /> Imprimir termo
        </button>
        {termo.modelo?.temArquivo && (
          <button className="btn btn-sm" onClick={baixarDocx}>
            <Icon name="download" size={13} /> Baixar termo (.docx)
          </button>
        )}
        <button className="btn btn-sm" onClick={toggleAssinado} disabled={toggling}>
          {termo.assinado ? 'Marcar como pendente' : 'Marcar como assinado'}
        </button>
      </div>

      {termo.modelo?.temArquivo && (
        <>
          <div className="section-title">Pré-visualização do documento</div>
          {docxError && (
            <p className="text-muted" style={{ fontSize: 12 }}>
              Não foi possível pré-visualizar este arquivo. Use "Baixar termo (.docx)" para abri-lo.
            </p>
          )}
          {docxLoading && <div className="center-py"><div className="spinner" /></div>}
          <div
            className={printMode ? 'print-only' : 'docx-render-box'}
            style={
              printMode
                ? undefined
                : {
                    display: docxError ? 'none' : 'block',
                    background: '#fff', borderRadius: 10, padding: 10,
                    maxHeight: 420, overflow: 'auto', marginBottom: 20,
                  }
            }
          >
            <div ref={docxContainerRef} />
          </div>
        </>
      )}

      <div className="section-title">Equipamentos vinculados</div>
      {termo.equipamentos.map((eq) => (
        <div key={eq.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 13 }}>
          <div>{eq.modelo} <span className="text-muted">({eq.tipo})</span></div>
          <div className="text-muted mono" style={{ fontSize: 11.5 }}>{eq.serial} · {eq.hostname || '—'}</div>
        </div>
      ))}
    </Drawer>
  );
}

function PrintView({ termo }) {
  return (
    <div className="print-only" style={{ padding: 40, color: '#000', background: '#fff' }}>
      <h2 style={{ marginBottom: 4 }}>{termo.modelo?.nome || 'Termo de Responsabilidade'} — {termo.numero}</h2>
      <p style={{ color: '#555', marginTop: 0 }}>Usina Caçu · Inventário de TI</p>
      <hr />
      <p><strong>Colaborador:</strong> {termo.colaborador}</p>
      <p><strong>Cargo:</strong> {termo.cargo || '—'}</p>
      <p><strong>Data:</strong> {formatDate(termo.data)}</p>
      <p><strong>Status:</strong> {termo.assinado ? `Assinado em ${formatDate(termo.dataAssinatura)}` : 'Pendente de assinatura'}</p>
      {termo.modelo?.texto && <p>{termo.modelo.texto}</p>}
      {termo.observacoes && <p><strong>Observações:</strong> {termo.observacoes}</p>}

      <h3>Equipamentos entregues</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 6, textAlign: 'left' }}>Tipo</th>
            <th style={{ border: '1px solid #999', padding: 6, textAlign: 'left' }}>Modelo</th>
            <th style={{ border: '1px solid #999', padding: 6, textAlign: 'left' }}>Serial</th>
          </tr>
        </thead>
        <tbody>
          {termo.equipamentos.map((eq) => (
            <tr key={eq.id}>
              <td style={{ border: '1px solid #999', padding: 6 }}>{eq.tipo}</td>
              <td style={{ border: '1px solid #999', padding: 6 }}>{eq.modelo}</td>
              <td style={{ border: '1px solid #999', padding: 6 }}>{eq.serial}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 80, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 6 }}>{termo.colaborador}</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 6 }}>TI · Usina Caçu</div>
        </div>
      </div>
    </div>
  );
}

function ModelosModal({ onClose }) {
  const { toast } = useToast();
  const { data, loading, reload } = useFetch('/termo-modelos', { limit: 100, sort: 'nome' });
  const modelos = data?.data || [];
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyModeloForm());
  const [saving, setSaving] = useState(false);

  function openEdit(m) {
    setEditingId(m.id);
    setForm({ nome: m.nome, texto: m.texto || '' });
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyModeloForm());
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/termo-modelos/${editingId}`, form);
        toast('Modelo atualizado.');
      } else {
        await api.post('/termo-modelos', form);
        toast('Modelo criado.');
      }
      setForm(emptyModeloForm());
      setEditingId(null);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(m) {
    try {
      await api.delete(`/termo-modelos/${m.id}`);
      toast('Modelo removido.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleUploadArquivo(modeloId, file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('arquivo', file);
    try {
      await api.upload(`/termo-modelos/${modeloId}/arquivo`, formData);
      toast('Arquivo .docx enviado.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleRemoveArquivo(modeloId) {
    try {
      await api.delete(`/termo-modelos/${modeloId}/arquivo`);
      toast('Arquivo removido — o modelo volta a usar o texto simples na impressão.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <Modal title="Modelos de termo" onClose={onClose} width={640}>
      <div className="panel" style={{ padding: 12, marginBottom: 16 }}>
        <div className="label-caps" style={{ marginBottom: 6 }}>Variáveis disponíveis no .docx</div>
        <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          %nome% %cargo% %cpf% %matricula% %setor% %numero% %data% %status% %data_assinatura% %observacoes% %serial% %imei% %modelo% %equipamentos%
          <br />
          Envie um arquivo .docx com essas variáveis no texto — a formatação original é mantida. %cpf%, %matricula%
          e %setor% só são preenchidos se o termo estiver vinculado a um Responsável cadastrado. Qualquer outra
          variável %assim% que não estiver nesta lista fica em branco no documento gerado.
        </p>
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}
      {!loading && modelos.length === 0 && <div className="empty-state"><p>Nenhum modelo cadastrado.</p></div>}
      {!loading && modelos.map((m) => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
          <div className="flex justify-between items-center">
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{m.nome}</span>
            <div className="flex gap-8">
              <button className="btn btn-sm" onClick={() => openEdit(m)}>Editar</button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(m)}>
                <Icon name="trash" size={13} />
              </button>
            </div>
          </div>
          {m.texto && <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>{m.texto}</p>}
          <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
            <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
              {m.temArquivo ? 'Substituir .docx' : 'Enviar .docx'}
              <input
                type="file"
                accept=".docx"
                style={{ display: 'none' }}
                onChange={(e) => handleUploadArquivo(m.id, e.target.files[0])}
              />
            </label>
            {m.temArquivo && (
              <>
                <span className="text-muted mono" style={{ fontSize: 11 }}>{m.arquivoNome}</span>
                <button className="btn btn-sm btn-danger" onClick={() => handleRemoveArquivo(m.id)}>Remover arquivo</button>
              </>
            )}
          </div>
        </div>
      ))}

      <form onSubmit={handleSave} style={{ marginTop: 18 }}>
        <div className="section-title">{editingId ? 'Editar modelo' : 'Novo modelo'}</div>
        <div className="field mb-12">
          <label>Nome *</label>
          <input className="input" required value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
        </div>
        <div className="field mb-12">
          <label>Texto do termo</label>
          <textarea className="input" rows={4} value={form.texto} onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))} />
        </div>
        <div className="flex gap-8">
          {editingId && <button type="button" className="btn" onClick={openNew}>Cancelar edição</button>}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar modelo'}</button>
        </div>
      </form>
    </Modal>
  );
}
