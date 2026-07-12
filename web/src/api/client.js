const API_BASE = '/api/v1';

let accessToken = localStorage.getItem('iti_access_token') || null;
let refreshToken = localStorage.getItem('iti_refresh_token') || null;
let refreshPromise = null;
let onUnauthorized = null;

export function setTokens(tokens) {
  accessToken = tokens.accessToken ?? accessToken;
  refreshToken = tokens.refreshToken ?? refreshToken;
  if (accessToken) localStorage.setItem('iti_access_token', accessToken);
  if (refreshToken) localStorage.setItem('iti_refresh_token', refreshToken);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('iti_access_token');
  localStorage.removeItem('iti_refresh_token');
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function doRefresh() {
  if (!refreshToken) throw new Error('sem refresh token');
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh falhou');
        const data = await res.json();
        setTokens(data);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request(path, { method = 'GET', body, headers = {}, isForm = false, retry = true } = {}) {
  const finalHeaders = { ...headers };
  if (!isForm) finalHeaders['Content-Type'] = 'application/json';
  if (accessToken) finalHeaders['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && retry && refreshToken && !path.startsWith('/auth/')) {
    try {
      await doRefresh();
      return request(path, { method, body, headers, isForm, retry: false });
    } catch {
      clearTokens();
      if (onUnauthorized) onUnauthorized();
      throw new ApiClientError(401, 'UNAUTHORIZED', 'Sessão expirada. Faça login novamente.');
    }
  }

  if (res.status === 204) return null;

  let data = null;
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

  return data;
}

export class ApiClientError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function fetchBlob(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    let message = 'Não foi possível carregar o arquivo.';
    try {
      const data = await res.json();
      message = data?.error?.message || message;
    } catch {
      // resposta não era JSON (ex.: erro genérico do servidor)
    }
    throw new ApiClientError(res.status, 'DOWNLOAD_ERROR', message);
  }
  return res;
}

async function download(path, fallbackFilename) {
  const res = await fetchBlob(path);
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function getBlob(path) {
  const res = await fetchBlob(path);
  return res.blob();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, isForm: true }),
  download,
  getBlob,
};

export function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}
