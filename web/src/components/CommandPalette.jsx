import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { api, qs } from '../api/client.js';

const PaletteContext = createContext(null);

export function CommandPaletteProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, openPalette, closePalette }}>
      {children}
      {open && <CommandPalette onClose={closePalette} />}
    </PaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('useCommandPalette deve ser usado dentro de CommandPaletteProvider');
  return ctx;
}

const QUICK_ACTIONS = [
  { label: 'Novo equipamento', to: '/inventario?novo=1' },
  { label: 'Nova ordem de serviço', to: '/manutencoes?nova=1' },
  { label: 'Novo termo de responsabilidade', to: '/termos?novo=1' },
  { label: 'Ver dashboard', to: '/' },
];

function CommandPalette({ onClose }) {
  const [term, setTerm] = useState('');
  const [equipamentos, setEquipamentos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (term.trim().length < 2) {
      setEquipamentos([]);
      setUsuarios([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      api
        .get(`/equipamentos${qs({ q: term, limit: 5 })}`)
        .then((res) => active && setEquipamentos(res.data))
        .catch(() => {});
      api
        .get(`/usuarios${qs({ q: term, limit: 5 })}`)
        .then((res) => active && setUsuarios(res.data))
        .catch(() => {});
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term]);

  const actions = QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(term.toLowerCase()));

  function go(to) {
    onClose();
    navigate(to);
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="palette">
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px' }}>
          <Icon name="search" size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            autoFocus
            className="palette-input"
            placeholder="Buscar equipamentos, usuários, ações…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            style={{ borderBottom: 'none' }}
          />
        </div>
        <div className="palette-results">
          {actions.length > 0 && (
            <div>
              <div className="palette-group-label">Ações</div>
              {actions.map((a) => (
                <div key={a.label} className="palette-item" onClick={() => go(a.to)}>
                  <Icon name="plus" size={14} />
                  {a.label}
                </div>
              ))}
            </div>
          )}
          {equipamentos.length > 0 && (
            <div>
              <div className="palette-group-label">Equipamentos</div>
              {equipamentos.map((e) => (
                <div key={e.id} className="palette-item" onClick={() => go(`/inventario?id=${e.id}`)}>
                  <Icon name="inventory" size={14} />
                  {e.modelo} — {e.patrimonio}
                  <span className="sub">{e.serial}</span>
                </div>
              ))}
            </div>
          )}
          {usuarios.length > 0 && (
            <div>
              <div className="palette-group-label">Usuários</div>
              {usuarios.map((u) => (
                <div key={u.id} className="palette-item" onClick={() => go('/acessos')}>
                  <Icon name="users" size={14} />
                  {u.nome}
                  <span className="sub">{u.email}</span>
                </div>
              ))}
            </div>
          )}
          {term.trim().length >= 2 && actions.length === 0 && equipamentos.length === 0 && usuarios.length === 0 && (
            <div className="empty-state">
              <p>Nenhum resultado para "{term}"</p>
            </div>
          )}
          {term.trim().length < 2 && (
            <div style={{ padding: '10px 12px' }}>
              <div className="palette-group-label">Ações rápidas</div>
              {QUICK_ACTIONS.map((a) => (
                <div key={a.label} className="palette-item" onClick={() => go(a.to)}>
                  <Icon name="plus" size={14} />
                  {a.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
