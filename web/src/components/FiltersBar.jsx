import { useLookup } from '../hooks/useApi.js';
import { Icon } from './Icons.jsx';

const STATUS_OPTIONS = ['Ativo', 'Manutencao', 'Estoque', 'Baixado'];

export function FiltersBar({ filters, onChange, showStatus = true, showSearch = true }) {
  const setores = useLookup('/setores');

  const hasActive = Object.values(filters).some((v) => v);

  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function clear() {
    onChange({});
  }

  return (
    <div className="filters-bar">
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
      {showStatus && (
        <div className="field">
          <label>Status</label>
          <select className="input" value={filters.status || ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'Manutencao' ? 'Manutenção' : s}
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
            placeholder="Serial, patrimônio, modelo…"
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
