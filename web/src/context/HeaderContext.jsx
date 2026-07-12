import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const HeaderContext = createContext(null);

export function HeaderProvider({ children }) {
  const [config, setConfig] = useState({ breadcrumb: '', title: '', action: null });
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
}

export function usePageHeader({ breadcrumb, title, action = null }) {
  const ctx = useContext(HeaderContext);
  useEffect(() => {
    ctx.setConfig({ breadcrumb, title, action });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breadcrumb, title, action]);
}

export function useHeaderConfig() {
  const ctx = useContext(HeaderContext);
  return ctx.config;
}
