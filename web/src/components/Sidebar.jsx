import { NavLink } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';

const NAV_GROUPS = [
  {
    label: 'Operação',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true, modulo: 'dashboard' },
      { to: '/inventario', label: 'Inventário', icon: 'inventory', modulo: 'inventario' },
      { to: '/manutencoes', label: 'Manutenções', icon: 'wrench', modulo: 'manutencoes' },
      { to: '/termos', label: 'Termos', icon: 'doc', modulo: 'termos' },
      { to: '/responsaveis', label: 'Responsáveis', icon: 'person', modulo: 'responsaveis' },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { to: '/acessos', label: 'Acessos', icon: 'users', modulo: 'acessos' },
      { to: '/cadastros', label: 'Cadastros', icon: 'grid', modulo: 'cadastros' },
      { to: '/configuracoes', label: 'Configurações', icon: 'settings', modulo: 'configuracoes' },
    ],
  },
];

export function Sidebar() {
  const { usuario, logout } = useAuth();

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

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => {
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
