import { useLookup } from '../hooks/useApi.js';
import { Icon } from './Icons.jsx';

export function FiltersBar({ filters, onChange, showStatus = true, showSetor = true, showSearch = true }) {
  const setores = useLookup('/setores');
  const statusOptions = useLookup('/status-ativo');

  const hasActive = Object.values(filters).some((v) => v);

  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function clear() {
    onChange({});
  }

  return (
    <div className="filters-bar">
      {showSetor && (
        <div className="field">
          <label>Setor</label>
          <select className="input" value={filters.setorId || ''} onChange={(e) => set('setorId', e.target.value)}>
            <option value="">Todos</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {showStatus && (
        <div className="field">
          <label>Status</label>
          <select className="input" value={filters.status || ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">Todos</option>
            {statusOptions.filter((s) => s.ativo || s.nome === filters.status).map((s) => (
              <option key={s.id} value={s.nome}>
                {s.nome === 'Manutencao' ? 'Manutenção' : s.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {showSearch && (
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Busca rápida</label>
          <input
            className="input w-full"
            placeholder="Serial, modelo…"
            value={filters.q || ''}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
      )}
      {hasActive && (
        <button className="btn btn-ghost btn-sm" onClick={clear} style={{ alignSelf: 'flex-end' }}>
          <Icon name="x" size={13} />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
