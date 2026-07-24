import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageHeader } from '../context/HeaderContext.jsx';
import { useFetch, useLookup } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { FiltersBar } from '../components/FiltersBar.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Drawer } from '../components/Drawer.jsx';
import { Modal } from '../components/Modal.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Icon } from '../components/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, radioStatusLabel, radioTipoLabel } from '../utils/format.js';

const COLUMNS = [
  { key: 'numeroSerie', label: 'Serial' },
  { key: null, label: 'ID' },
  { key: 'dataAquisicao', label: 'Data de Aquisição' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'modelo', label: 'Modelo' },
  { key: null, label: 'Colaborador Responsável' },
  { key: 'area', label: 'Área' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'status', label: 'Status' },
];

function radioId(r) {
  const texto = `${r.area?.sigla || ''}${r.codigo || ''}`;
  return texto || '—';
}

function emptyForm() {
  return {
    numeroSerie: '', modelo: '', idDigital: '', idAnalogico: '', tipo: '', codigo: '',
    colaboradorResponsavel: '', frotaId: '', areaId: '', responsavelId: '',
    status: 'Ativo', dataAquisicao: '', observacoes: '',
  };
}

export function Radios() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({});
  const [colFilters, setColFilters] = useState({ numeroSerie: '', frotaId: '', responsavelId: '', modelo: '' });
  const [sort, setSort] = useState('-updatedAt');
  const [page, setPage] = useState(1);
  const [infoId, setInfoId] = useState(null);
  const [historicoId, setHistoricoId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [confirmCondenar, setConfirmCondenar] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const frotas = useLookup('/frotas');
  const areasGeo = useLookup('/areas-geo');
  const responsaveisGeo = useLookup('/responsaveis-geo');

  const queryParams = {
    ...filters,
    numeroSerie: colFilters.numeroSerie || undefined,
    frotaId: colFilters.frotaId || undefined,
    responsavelId: colFilters.responsavelId || undefined,
    modelo: colFilters.modelo || undefined,
    sort,
    page,
    limit: 20,
  };

  const { data, loading, reload } = useFetch('/radios', queryParams);
  const radios = data?.data || [];
  const meta = data?.meta;

  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      openNew();
      setSearchParams({}, { replace: true });
    }
    const id = searchParams.get('id');
    if (id) {
      setInfoId(Number(id));
      setSearchParams({}, { replace: true });
    }
    const responsavelId = searchParams.get('responsavelId');
    if (responsavelId) {
      setColFilters((s) => ({ ...s, responsavelId }));
      setSearchParams({}, { replace: true });
    }
    const modelo = searchParams.get('modelo');
    if (modelo) {
      setColFilters((s) => ({ ...s, modelo }));
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  usePageHeader({
    breadcrumb: 'Geotecnologia / Rádios',
    title: 'Rádios',
    action: (
      <button className="btn btn-primary" onClick={openNew}>
        <Icon name="plus" size={15} /> Novo rádio
      </button>
    ),
  });

  function toggleSort(key) {
    if (!key) return;
    setPage(1);
    setSort((prev) => (prev === key ? `-${key}` : prev === `-${key}` ? key : key));
  }

  function sortArrow(key) {
    if (!key) return '';
    if (sort === key) return '↑';
    if (sort === `-${key}`) return '↓';
    return '';
  }

  function openEdit(r) {
    setEditingId(r.id);
    setForm({
      numeroSerie: r.numeroSerie, modelo: r.modelo || '',
      idDigital: r.idDigital || '', idAnalogico: r.idAnalogico || '',
      tipo: r.tipo || '', codigo: r.codigo || '', colaboradorResponsavel: r.colaboradorResponsavel || '',
      frotaId: r.frota?.id || '',
      areaId: r.area?.id || '', responsavelId: r.responsavel?.id || '',
      status: r.status, dataAquisicao: r.dataAquisicao?.slice(0, 10) || '', observacoes: r.observacoes || '',
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
        await api.put(`/radios/${editingId}`, payload);
        toast('Rádio atualizado.');
      } else {
        await api.post('/radios', payload);
        toast('Rádio cadastrado.');
      }
      setShowForm(false);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCondenar() {
    const r = confirmCondenar;
    setConfirmCondenar(null);
    try {
      await api.put(`/radios/${r.id}`, { status: 'Baixado' });
      toast(`${r.numeroSerie} marcado como condenado (Baixado).`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleDelete() {
    const r = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/radios/${r.id}`);
      toast('Rádio excluído.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const hasFilters = Object.values(filters).some(Boolean) || Object.values(colFilters).some(Boolean);

  return (
    <div>
      <FiltersBar filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} showSetor={false} />

      {colFilters.responsavelId && (
        <div className="flex items-center gap-8 mb-16">
          <span className="text-secondary" style={{ fontSize: 13 }}>
            Filtrando por responsável: <strong>{responsaveisGeo.find((r) => String(r.id) === String(colFilters.responsavelId))?.nome || '—'}</strong>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setColFilters((s) => ({ ...s, responsavelId: '' }))}>
            <Icon name="x" size={13} /> Limpar
          </button>
        </div>
      )}

      {colFilters.modelo && (
        <div className="flex items-center gap-8 mb-16">
          <span className="text-secondary" style={{ fontSize: 13 }}>
            Filtrando por modelo: <strong>{colFilters.modelo}</strong>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setColFilters((s) => ({ ...s, modelo: '' }))}>
            <Icon name="x" size={13} /> Limpar
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.label} onClick={() => toggleSort(c.key)} style={c.key ? undefined : { cursor: 'default' }}>
                  {c.label}
                  <span className="sort-arrow">{sortArrow(c.key)}</span>
                </th>
              ))}
              <th style={{ width: 150 }}>Ações</th>
            </tr>
            <tr className="filter-row">
              <th><input className="input" placeholder="Filtrar serial…" value={colFilters.numeroSerie} onChange={(e) => { setColFilters((s) => ({ ...s, numeroSerie: e.target.value })); setPage(1); }} /></th>
              <th />
              <th />
              <th />
              <th />
              <th />
              <th>
                <select className="input" value={colFilters.frotaId} onChange={(e) => { setColFilters((s) => ({ ...s, frotaId: e.target.value })); setPage(1); }}>
                  <option value="">Todas frotas</option>
                  {frotas.map((f) => <option key={f.id} value={f.id}>{f.numero} · {f.nome}</option>)}
                </select>
              </th>
              <th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {radios.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ color: 'var(--accent)' }}>{r.numeroSerie}</td>
                <td className="mono">{radioId(r)}</td>
                <td>{formatDate(r.dataAquisicao)}</td>
                <td>{radioTipoLabel(r.tipo)}</td>
                <td>{r.modelo || '—'}</td>
                <td>{r.colaboradorResponsavel || '—'}</td>
                <td className="text-secondary">{r.area?.nome || '—'}</td>
                <td>{r.responsavel?.nome || '—'}</td>
                <td><StatusBadge status={r.status} label={radioStatusLabel(r.status)} /></td>
                <td>
                  <div className="flex gap-8">
                    <button className="btn btn-sm" title="Informações do Rádio" onClick={() => setInfoId(r.id)}>
                      <Icon name="info" size={14} />
                    </button>
                    <button className="btn btn-sm" title="Ver Histórico de Reparo" onClick={() => setHistoricoId(r.id)}>
                      <Icon name="history" size={14} />
                    </button>
                    <button className="btn btn-sm" title="Editar Rádio" onClick={() => openEdit(r)}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button className="btn btn-sm btn-danger" title="Condenar Rádio" onClick={() => setConfirmCondenar(r)}>
                      <Icon name="xCircle" size={14} />
                    </button>
                    <button className="btn btn-sm btn-danger" title="Excluir" onClick={() => setConfirmDelete(r)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {radios.length === 0 && !loading && (
          <div className="empty-state">
            <div className="icon">📻</div>
            <p>Nenhum rádio encontrado{hasFilters ? ' para os filtros aplicados' : ''}.</p>
            {hasFilters && (
              <button className="btn btn-sm" onClick={() => { setFilters({}); setColFilters({ numeroSerie: '', frotaId: '', responsavelId: '', modelo: '' }); }}>
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {loading && <div className="center-py"><div className="spinner" /></div>}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center" style={{ marginTop: 14 }}>
          <span className="text-muted" style={{ fontSize: 12.5 }}>
            Página {meta.page} de {meta.totalPages} · {meta.total} rádio(s)
          </span>
          <div className="flex gap-8">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
          </div>
        </div>
      )}

      {infoId && <RadioInfoDrawer id={infoId} onClose={() => setInfoId(null)} />}
      {historicoId && <RadioHistoricoDrawer id={historicoId} onClose={() => setHistoricoId(null)} />}

      {showForm && (
        <Modal title={editingId ? 'Editar rádio' : 'Novo rádio'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field full">
                <label>Número de série *</label>
                <input className="input" required value={form.numeroSerie} onChange={(e) => setForm((f) => ({ ...f, numeroSerie: e.target.value }))} />
              </div>
              <div className="field">
                <label>Tipo</label>
                <select className="input" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  <option value="">—</option>
                  <option value="Movel">Móvel</option>
                  <option value="Portatil">Portátil</option>
                </select>
              </div>
              <div className="field">
                <label>Modelo</label>
                <input className="input" value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div className="field">
                <label>Código (ID do rádio)</label>
                <input className="input" placeholder="Ex.: m3108" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} />
              </div>
              <div className="field">
                <label>Colaborador Responsável</label>
                <input className="input" value={form.colaboradorResponsavel} onChange={(e) => setForm((f) => ({ ...f, colaboradorResponsavel: e.target.value }))} />
              </div>
              <div className="field">
                <label>ID Digital</label>
                <input className="input" value={form.idDigital} onChange={(e) => setForm((f) => ({ ...f, idDigital: e.target.value }))} />
              </div>
              <div className="field">
                <label>ID Analógico</label>
                <input className="input" value={form.idAnalogico} onChange={(e) => setForm((f) => ({ ...f, idAnalogico: e.target.value }))} />
              </div>
              <div className="field">
                <label>Frota</label>
                <select className="input" value={form.frotaId} onChange={(e) => setForm((f) => ({ ...f, frotaId: e.target.value }))}>
                  <option value="">—</option>
                  {frotas.filter((f) => f.ativo || String(f.id) === String(form.frotaId)).map((f) => (
                    <option key={f.id} value={f.id}>{f.numero} · {f.nome}{!f.ativo ? ' (inativa)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Área</label>
                <select className="input" value={form.areaId} onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}>
                  <option value="">—</option>
                  {areasGeo.filter((a) => a.ativo || String(a.id) === String(form.areaId)).map((a) => (
                    <option key={a.id} value={a.id}>{a.sigla ? `${a.sigla} · ` : ''}{a.nome}{!a.ativo ? ' (inativa)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Responsável</label>
                <select className="input" value={form.responsavelId} onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}>
                  <option value="">—</option>
                  {responsaveisGeo.filter((r) => r.ativo || String(r.id) === String(form.responsavelId)).map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}{!r.ativo ? ' (inativo)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="Ativo">Em Campo</option>
                  <option value="Manutencao">Manutenção</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Baixado">Baixado</option>
                </select>
              </div>
              <div className="field">
                <label>Data de aquisição</label>
                <input type="date" className="input" value={form.dataAquisicao} onChange={(e) => setForm((f) => ({ ...f, dataAquisicao: e.target.value }))} />
              </div>
              <div className="field full">
                <label>Observações</label>
                <textarea className="input" rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '18px 0 0', border: 'none' }}>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmCondenar && (
        <ConfirmDialog
          title="Condenar rádio"
          message={`Marcar o rádio ${confirmCondenar.numeroSerie} como condenado (Baixado)? Ele deixa de ser considerado utilizável.`}
          confirmLabel="Condenar"
          danger
          onConfirm={handleCondenar}
          onCancel={() => setConfirmCondenar(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir rádio"
          message={`Excluir o rádio ${confirmDelete.numeroSerie}? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function RadioInfoDrawer({ id, onClose }) {
  const { data: radio, loading } = useFetch(`/radios/${id}`, {}, [id]);

  if (loading || !radio) {
    return (
      <Drawer title="Carregando…" onClose={onClose}>
        <div className="center-py"><div className="spinner" /></div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title={radio.numeroSerie}
      subtitle={<StatusBadge status={radio.status} label={radioStatusLabel(radio.status)} />}
      onClose={onClose}
    >
      <div className="detail-grid">
        <div className="detail-field">
          <div className="label-caps">Nº de série</div>
          <div className="value mono">{radio.numeroSerie}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">ID</div>
          <div className="value mono">{radioId(radio)}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Tipo</div>
          <div className="value">{radioTipoLabel(radio.tipo)}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Modelo</div>
          <div className="value">{radio.modelo || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">ID Digital</div>
          <div className="value mono">{radio.idDigital || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">ID Analógico</div>
          <div className="value mono">{radio.idAnalogico || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Frota</div>
          <div className="value">{radio.frota ? `${radio.frota.numero} · ${radio.frota.nome}` : '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Área</div>
          <div className="value">{radio.area?.nome || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Colaborador Responsável</div>
          <div className="value">{radio.colaboradorResponsavel || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Responsável</div>
          <div className="value">{radio.responsavel?.nome || '—'}</div>
        </div>
        <div className="detail-field">
          <div className="label-caps">Aquisição</div>
          <div className="value">{formatDate(radio.dataAquisicao)}</div>
        </div>
      </div>
      {radio.observacoes && (
        <div className="detail-field" style={{ marginTop: 4 }}>
          <div className="label-caps">Observações</div>
          <div className="value">{radio.observacoes}</div>
        </div>
      )}
    </Drawer>
  );
}

function RadioHistoricoDrawer({ id, onClose }) {
  const { data: radio, loading } = useFetch(`/radios/${id}`, {}, [id]);

  if (loading || !radio) {
    return (
      <Drawer title="Carregando…" onClose={onClose}>
        <div className="center-py"><div className="spinner" /></div>
      </Drawer>
    );
  }

  return (
    <Drawer title={`Histórico de reparo · ${radio.numeroSerie}`} onClose={onClose}>
      {(!radio.manutencoes || radio.manutencoes.length === 0) && (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <p>Nenhuma manutenção registrada para este rádio.</p>
        </div>
      )}
      {radio.manutencoes?.map((m) => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
          <div className="flex justify-between items-center">
            <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{m.os}</span>
            <StatusBadge status={m.status} />
          </div>
          <div style={{ fontSize: 13, margin: '4px 0 2px' }}>{m.titulo}</div>
          <div className="text-muted" style={{ fontSize: 11.5 }}>{m.tipo} · {m.tecnico || 'sem técnico'} · {formatDate(m.data)}</div>
        </div>
      ))}
    </Drawer>
  );
}
