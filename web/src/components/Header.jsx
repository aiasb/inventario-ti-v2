import { useState } from 'react';
import { Icon } from './Icons.jsx';
import { useHeaderConfig } from '../context/HeaderContext.jsx';
import { useCommandPalette } from './CommandPalette.jsx';
import { useEmpresa } from '../context/EmpresaContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { formatDateTime } from '../utils/format.js';

export function Header() {
  const { breadcrumb, title, action } = useHeaderConfig();
  const { openPalette } = useCommandPalette();
  const { empresaAtual } = useEmpresa();
  const [notifOpen, setNotifOpen] = useState(false);

  const isGeo = empresaAtual === 'geotecnologia';
  const { data } = useFetch(isGeo ? '/manutencoes-radios' : '/manutencoes', { status: 'Aberta', limit: 5, sort: '-data' }, [isGeo]);
  const notifications = data?.data || [];

  return (
    <header className="header">
      <div className="header-titles">
        <div className="breadcrumb mono">{breadcrumb}</div>
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        <button className="search-trigger" onClick={openPalette}>
          <Icon name="search" size={15} />
          Buscar em tudo…
          <kbd>Ctrl K</kbd>
        </button>

        <div className="header-actions-wrap">
          <button className="icon-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Notificações">
            <Icon name="bell" size={16} />
            {notifications.length > 0 && <span className="notif-dot" />}
          </button>
          {notifOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 45 }} onClick={() => setNotifOpen(false)} />
              <div className="dropdown">
                <div className="dropdown-header">Ordens de serviço em aberto</div>
                {notifications.length === 0 && (
                  <div className="dropdown-item text-muted">Nenhuma notificação no momento.</div>
                )}
                {notifications.map((n) => (
                  <div className="dropdown-item" key={n.id}>
                    <div className="title">
                      {n.os} · {n.titulo}
                    </div>
                    <div className="time">{formatDateTime(n.data)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {action}
      </div>
    </header>
  );
}
