import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useEmpresa } from '../context/EmpresaContext.jsx';
import { initials } from '../utils/format.js';

// Dashboard não pertence a nenhum grupo de empresa — o conteúdo já se
// adapta sozinho à empresa selecionada (ver Dashboard.jsx), então o link
// precisa ficar sempre visível, ou some ao trocar de empresa.
const DASHBOARD_ITEM = { to: '/', label: 'Dashboard', icon: 'dashboard', end: true, modulo: 'dashboard' };

const NAV_GROUPS = [
  {
    label: 'Operação',
    empresa: 'ti',
    items: [
      { to: '/inventario', label: 'Inventário', icon: 'inventory', modulo: 'inventario' },
      { to: '/manutencoes', label: 'Manutenções', icon: 'wrench', modulo: 'manutencoes' },
      { to: '/termos', label: 'Termos', icon: 'doc', modulo: 'termos' },
      { to: '/responsaveis', label: 'Responsáveis', icon: 'person', modulo: 'responsaveis' },
      { to: '/cadastros', label: 'Cadastros', icon: 'grid', modulo: 'cadastros' },
    ],
  },
  {
    label: 'Geotecnologia',
    empresa: 'geotecnologia',
    items: [
      { to: '/radios', label: 'Rádios', icon: 'inventory', modulo: 'radios' },
      { to: '/manutencoes-radios', label: 'Manutenções', icon: 'wrench', modulo: 'manutencoesRadios' },
      { to: '/responsaveis-geo', label: 'Responsáveis', icon: 'person', modulo: 'responsaveisGeo' },
      { to: '/cadastros-geo', label: 'Cadastros', icon: 'grid', modulo: 'cadastrosGeo' },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { to: '/acessos', label: 'Acessos', icon: 'users', modulo: 'acessos' },
      { to: '/configuracoes', label: 'Configurações', icon: 'settings', modulo: 'configuracoes' },
    ],
  },
];

function EmpresaSwitcher() {
  const { empresaAtual, empresas, setEmpresaAtual } = useEmpresa();
  const [open, setOpen] = useState(false);

  if (empresas.length <= 1) return null;
  const atual = empresas.find((e) => e.slug === empresaAtual);

  return (
    <div style={{ position: 'relative', margin: '0 16px 12px' }}>
      <button
        type="button"
        className="btn btn-sm w-full"
        style={{ justifyContent: 'space-between' }}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{atual?.nome || 'Selecionar empresa'}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 20 }}
            onClick={() => setOpen(false)}
          />
          <div
            className="panel"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 21, padding: 6 }}
          >
            {empresas.map((e) => (
              <button
                key={e.id}
                type="button"
                className="btn btn-sm w-full"
                style={{ justifyContent: 'flex-start', marginBottom: 2, background: e.slug === empresaAtual ? 'var(--surface-hover, rgba(255,255,255,0.06))' : 'transparent' }}
                onClick={() => { setEmpresaAtual(e.slug); setOpen(false); }}
              >
                {e.nome}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const { empresaAtual } = useEmpresa();

  function podeVer(modulo) {
    // Sem mapa de permissões carregado ainda (ex.: sessão de token de API), libera por padrão.
    if (!usuario?.permissoes) return true;
    return usuario.permissoes[modulo]?.podeVer !== false;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo-cacu.png" alt="Usina Caçu" className="sidebar-brand-mark" />
        <div className="sidebar-brand-text">
          <div className="company">USINA CAÇU</div>
          <div className="product">Inventário TI</div>
        </div>
      </div>

      <EmpresaSwitcher />

      <nav className="sidebar-nav">
        {podeVer(DASHBOARD_ITEM.modulo) && (
          <div className="sidebar-group">
            <NavLink
              to={DASHBOARD_ITEM.to}
              end={DASHBOARD_ITEM.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon name={DASHBOARD_ITEM.icon} size={16} className="icon" />
              {DASHBOARD_ITEM.label}
            </NavLink>
          </div>
        )}
        {NAV_GROUPS.map((group) => {
          if (group.empresa && group.empresa !== empresaAtual) return null;
          const items = group.items.filter((item) => podeVer(item.modulo));
          if (items.length === 0) return null;
          return (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-group-label">{group.label}</div>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <Icon name={item.icon} size={16} className="icon" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">
            {initials(usuario?.nome)}
            <span className="user-status-dot" />
          </div>
          <div className="user-info">
            <div className="name">{usuario?.nome}</div>
            <div className="role">{usuario?.cargo || usuario?.perfil}</div>
          </div>
          <button className="logout-btn" title="Sair" onClick={logout}>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
