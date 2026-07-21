import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiClientError,
  api,
  bootstrapAuth,
  clearTokens,
  getApiBaseUrl,
  hasAccessToken,
  setApiBaseUrl,
  setTokens,
  setUnauthorizedHandler,
} from '../api/client';
import { Empresa, ModulePermission } from '../types/models';

const CACHED_USER_KEY = '@inventario/cachedUsuario';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
  perfil: string;
  perfilId: number;
  ativo: boolean;
  permissoes?: Record<string, ModulePermission>;
  empresas?: Empresa[];
}

interface AuthContextValue {
  usuario: Usuario | null;
  loading: boolean;
  serverUrl: string;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  updateServerUrl: (url: string) => Promise<void>;
  podeVer: (modulo: string) => boolean;
  podeCriar: (modulo: string) => boolean;
  podeEditar: (modulo: string) => boolean;
  podeExcluir: (modulo: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const logout = useCallback(async () => {
    await clearTokens();
    await AsyncStorage.removeItem(CACHED_USER_KEY);
    setUsuario(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUsuario(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const hadToken = await bootstrapAuth();
      setServerUrl(getApiBaseUrl());
      if (!hadToken) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.get<{ usuario: Usuario }>('/auth/me');
        setUsuario(data.usuario);
        await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.usuario));
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 0) {
          // Sem rede no momento em que o app abriu — mantém a sessão com os
          // dados do último /auth/me bem-sucedido em vez de deslogar (o
          // token persistido continua válido e será revalidado assim que
          // alguma chamada à API for possível).
          const cached = await AsyncStorage.getItem(CACHED_USER_KEY);
          if (cached) setUsuario(JSON.parse(cached));
        } else {
          await clearTokens();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; usuario: Usuario }>('/auth/login', {
      email,
      senha,
    });
    await setTokens(data);
    setUsuario(data.usuario);
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.usuario));
  }, []);

  const updateServerUrl = useCallback(async (url: string) => {
    await setApiBaseUrl(url);
    setServerUrl(getApiBaseUrl());
  }, []);

  const podeVer = useCallback((modulo: string) => !usuario?.permissoes || usuario.permissoes[modulo]?.podeVer !== false, [usuario]);
  const podeCriar = useCallback((modulo: string) => !!usuario?.permissoes?.[modulo]?.podeCriar, [usuario]);
  const podeEditar = useCallback((modulo: string) => !!usuario?.permissoes?.[modulo]?.podeEditar, [usuario]);
  const podeExcluir = useCallback((modulo: string) => !!usuario?.permissoes?.[modulo]?.podeExcluir, [usuario]);

  return (
    <AuthContext.Provider
      value={{ usuario, loading, serverUrl, login, logout, updateServerUrl, podeVer, podeCriar, podeEditar, podeExcluir }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

export { hasAccessToken };
