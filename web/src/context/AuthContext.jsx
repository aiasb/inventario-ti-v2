import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setTokens, clearTokens, getAccessToken, setUnauthorizedHandler } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearTokens();
    setUsuario(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUsuario(null));
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.get('/auth/me');
        setUsuario(data.usuario);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (email, senha) => {
    const data = await api.post('/auth/login', { email, senha });
    setTokens(data);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
