import { useEffect } from 'react';
import { Icon } from './Icons.jsx';

export function Drawer({ title, subtitle, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <h3>{title}</h3>
            {subtitle && <div style={{ marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
}
