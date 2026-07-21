import { useMemo, useState } from 'react';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/format.js';

const STATUS_LIST = ['Em Aberto', 'Enviado', 'Em Analise', 'Finalizado', 'Recusado'];
const STATUS_LABELS = {
  'Em Aberto': 'Em Aberto',
  Enviado: 'Enviado',
  'Em Analise': 'Em Análise',
  Finalizado: 'Finalizado',
  Recusado: 'Recusado/Condenado',
};
const STATUS_CLASS = {
  'Em Aberto': 'badge-manutencao',
  Enviado: 'badge-andamento',
  'Em Analise': 'badge-estoque',
  Finalizado: 'badge-ativo',
  Recusado: 'badge-baixado',
};

function isLocked(status) {
  return status === 'Finalizado' || status === 'Recusado';
}

function emptyItem() {
  return { radioId: '', numeroOs: '', solicitante: '' };
}

function emptyForm() {
  return {
    transportadoraId: '', fornecedorId: '', notaFiscal: '', data: '', observacoes: '',
    itens: [emptyItem()],
  };
}

export function Ocorrencias() {
  const { toast } = useToast();
  const [statusFiltro, setStatusFiltro] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, loading, reload } = useFetch('/ocorrencias', { limit: 300, sort: '-data' });
  const todas = data?.data || [];
  const radios = useLookup('/radios');
  const transportadoras = useLookup('/transportadoras');
  const fornecedores = useLookup('/fornecedores-geo');

  const contadores = useMemo(() => {
    const map = STATUS_LIST.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
    for (const o of todas) map[o.status] = (map[o.status] || 0) + 1;
    return map;
  }, [todas]);

  const listaFiltrada = statusFiltro ? todas.filter((o) => o.status === statusFiltro) : todas;

  usePageHeader({
    breadcrumb: 'Geotecnologia / Ocorrências',
    title: 'Gestão de Ocorrências',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Nova Ocorrência
      </button>
    ),
  });

  function updateItem(idx, key, value) {
    setForm((f) => ({ ...f, itens: f.itens.map((it, i) => (i === idx ? { ...it, [key]: value } : it)) }));
  }
  function addItem() {
    setForm((f) => ({ ...f, itens: [...f.itens, emptyItem()] }));
  }
  function removeItem(idx) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openView(o) {
    setEditing(o);
    setForm({
      transportadoraId: o.transportadora?.id || '', fornecedorId: o.fornecedor?.id || '',
      notaFiscal: o.notaFiscal || '', data: o.data?.slice(0, 10) || '', observacoes: o.observacoes || '',
      itens: o.itens.length ? o.itens.map((i) => ({ radioId: i.radioId, numeroOs: i.numeroOs || '', solicitante: i.solicitante || '' })) : [emptyItem()],
    });
    setShowForm(true);
  }

  const locked = editing ? isLocked(editing.status) : false;

  async function handleSave(e) {
    e.preventDefault();
    const itensValidos = form.itens.filter((it) => it.radioId);
    if (itensValidos.length === 0) {
      toast('Vincule ao menos um rádio à ocorrência.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        transportadoraId: form.transportadoraId || null,
        fornecedorId: form.fornecedorId || null,
        notaFiscal: form.notaFiscal || null,
        data: form.data || null,
        observacoes: form.observacoes || null,
        itens: itensValidos,
      };
      if (editing) {
        await api.put(`/ocorrencias/${editing.id}`, payload);
        toast('Ocorrência atualizada.');
      } else {
        await api.post('/ocorrencias', payload);
        toast('Ocorrência criada.');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStatus(o, status) {
    try {
      await api.patch(`/ocorrencias/${o.id}/status`, { status });
      toast(`Status alterado para "${STATUS_LABELS[status]}".`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleDelete() {
    const o = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/ocorrencias/${o.id}`);
      toast('Ocorrência excluída.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {STATUS_LIST.map((s) => (
          <div
            key={s}
            className={`kpi-card${statusFiltro === s ? ' accent' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFiltro(statusFiltro === s ? '' : s)}
          >
            <div className="kpi-label">{STATUS_LABELS[s]}</div>
            <div className="kpi-value-row">
              <span className="kpi-value">{contadores[s] || 0}</span>
            </div>
          </div>
        ))}
      </div>

      {statusFiltro && (
        <button className="btn btn-ghost btn-sm mb-16" onClick={() => setStatusFiltro('')}>
          <Icon name="x" size={13} /> Limpar filtro ({STATUS_LABELS[statusFiltro]})
        </button>
      )}

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {!loading && listaFiltrada.length === 0 && (
        <div className="empty-state"><p>Nenhuma ocorrência encontrada.</p></div>
      )}

      {!loading && listaFiltrada.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Número</th><th>Transportadora</th><th>Fornecedor</th><th>Nota Fiscal</th>
                <th>Data</th><th>Itens</th><th>Status</th><th style={{ width: 90 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((o) => {
                const trava = isLocked(o.status);
                return (
                  <tr key={o.id}>
                    <td className="mono" style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => openView(o)}>{o.numero}</td>
                    <td>{o.transportadora?.nome || '—'}</td>
                    <td>{o.fornecedor?.nome || '—'}</td>
                    <td className="mono">{o.notaFiscal || '—'}</td>
                    <td>{formatDate(o.data)}</td>
                    <td>{o.itens.length} item(ns)</td>
                    <td>
                      <select
                        className="input"
                        style={{ padding: '4px 8px', fontSize: 12.5, minWidth: 150 }}
                        value={o.status}
                        disabled={trava}
                        onChange={(e) => handleChangeStatus(o, e.target.value)}
                      >
                        {STATUS_LIST.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-sm" onClick={() => openView(o)}>
                          {trava ? 'Ver' : 'Editar'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(o)}>
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
        <Modal
          title={editing ? `Ocorrência ${editing.numero}${locked ? ' (somente leitura)' : ''}` : 'Nova Ocorrência'}
          onClose={() => setShowForm(false)}
          width={640}
        >
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field">
                <label>Transportadora</label>
                <select className="input" disabled={locked} value={form.transportadoraId} onChange={(e) => setForm((f) => ({ ...f, transportadoraId: e.target.value }))}>
                  <option value="">Selecione</option>
                  {transportadoras.filter((t) => t.ativo || String(t.id) === String(form.transportadoraId)).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Fornecedor</label>
                <select className="input" disabled={locked} value={form.fornecedorId} onChange={(e) => setForm((f) => ({ ...f, fornecedorId: e.target.value }))}>
                  <option value="">Selecione</option>
                  {fornecedores.filter((f) => f.ativo || String(f.id) === String(form.fornecedorId)).map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Nota Fiscal</label>
                <input className="input" disabled={locked} value={form.notaFiscal} onChange={(e) => setForm((f) => ({ ...f, notaFiscal: e.target.value }))} />
              </div>
              <div className="field">
                <label>Data</label>
                <input type="date" className="input" disabled={locked} value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Observações</label>
                <textarea className="input" rows={2} disabled={locked} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>

            <div className="section-title" style={{ marginTop: 16 }}>Ativos vinculados</div>
            {form.itens.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                <div className="field" style={{ flex: 2, marginBottom: 0 }}>
                  {idx === 0 && <label>Rádio *</label>}
                  <select className="input" disabled={locked} value={item.radioId} onChange={(e) => updateItem(idx, 'radioId', e.target.value)}>
                    <option value="">Selecione o rádio</option>
                    {radios.map((r) => (
                      <option key={r.id} value={r.id}>{r.numeroSerie}{r.modelo ? ' · ' + r.modelo : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  {idx === 0 && <label>Nº OS/Solicitação</label>}
                  <input className="input" disabled={locked} value={item.numeroOs} onChange={(e) => updateItem(idx, 'numeroOs', e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  {idx === 0 && <label>Solicitante</label>}
                  <input className="input" disabled={locked} value={item.solicitante} onChange={(e) => updateItem(idx, 'solicitante', e.target.value)} />
                </div>
                {!locked && form.itens.length > 1 && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(idx)}>
                    <Icon name="trash" size={13} />
                  </button>
                )}
              </div>
            ))}
            {!locked && (
              <button type="button" className="btn btn-sm" onClick={addItem} style={{ marginTop: 4 }}>
                <Icon name="plus" size={13} /> Adicionar item
              </button>
            )}

            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>{locked ? 'Fechar' : 'Cancelar'}</button>
              {!locked && (
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir ocorrência"
          message={`Excluir a ocorrência ${confirmDelete.numero}? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
