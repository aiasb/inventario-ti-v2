import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const SERVER_URL_KEY = '@inventario/serverUrl';
const ACCESS_TOKEN_KEY = 'iti_access_token';
const REFRESH_TOKEN_KEY = 'iti_refresh_token';

const DEFAULT_API_URL = (Constants.expoConfig?.extra?.apiUrl as string) || 'http://localhost:8080/api/v1';

let apiBaseUrl = DEFAULT_API_URL;
let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<{ accessToken: string; refreshToken?: string }> | null = null;
let onUnauthorized: (() => void) | null = null;

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  apiBaseUrl = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem(SERVER_URL_KEY, apiBaseUrl);
}

export function getDefaultApiUrl(): string {
  return DEFAULT_API_URL;
}

/** Restaura URL do servidor e tokens salvos. Deve ser chamado uma vez, antes de renderizar o app. */
export async function bootstrapAuth(): Promise<boolean> {
  const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
  if (savedUrl) apiBaseUrl = savedUrl;

  const [savedAccess, savedRefresh] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  accessToken = savedAccess;
  refreshToken = savedRefresh;
  return !!accessToken;
}

export async function setTokens(tokens: { accessToken?: string; refreshToken?: string }): Promise<void> {
  if (tokens.accessToken) {
    accessToken = tokens.accessToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    refreshToken = tokens.refreshToken;
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
}

export function hasAccessToken(): boolean {
  return !!accessToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function doRefresh(): Promise<{ accessToken: string; refreshToken?: string }> {
  if (!refreshToken) throw new Error('sem refresh token');
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh falhou');
        const data = await res.json();
        await setTokens(data);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isForm?: boolean;
  retry?: boolean;
  headers?: Record<string, string>;
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isForm = false, retry = true } = options;
  const headers: Record<string, string> = { ...options.headers };
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as BodyInit) : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK_ERROR', `Não foi possível conectar ao servidor (${apiBaseUrl}). Verifique o endereço configurado e a rede.`);
  }

  if (res.status === 401 && retry && refreshToken && !path.startsWith('/auth/')) {
    try {
      await doRefresh();
      return request<T>(path, { ...options, retry: false });
    } catch {
      await clearTokens();
      if (onUnauthorized) onUnauthorized();
      throw new ApiClientError(401, 'UNAUTHORIZED', 'Sessão expirada. Faça login novamente.');
    }
  }

  if (res.status === 204) return null as T;

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiClientError(res.status, err.code || 'ERROR', err.message || 'Erro inesperado.', err.details);
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),
  put: <T = any>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body, headers }),
  patch: <T = any>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),
  delete: <T = any>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', headers }),
};

export function qs(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}
