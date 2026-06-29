import { getApiBaseUrl } from '@/src/api/api-config';
import { apiLanguageHeader } from '@/src/i18n';
import type { ApiErrorBody } from '@/src/api/auth-types';
import { notifySessionExpired } from '@/src/auth/auth-session-events';
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from '@/src/auth/token-storage';
import type { AuthSession } from '@/src/api/auth-types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds?: number;

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const AUTH_ERROR_CODES = new Set([
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'TOKEN_REVOKED',
  'REFRESH_EXPIRED',
  'INVALID_REFRESH',
]);

/** 401 responses that must not clear the Creator JWT session (mailbox OAuth, login forms, etc.). */
const NON_SESSION_401_CODES = new Set([
  'MAILBOX_ACCESS_TOKEN_MISSING',
  'INVALID_CREDENTIALS',
  'INVALID_ACCESS_TOKEN',
  'INVALID_ID_TOKEN',
  'INVALID_MS_TOKEN',
  'INVALID_AUDIENCE',
  'GOOGLE_TOKEN_EXCHANGE_FAILED',
  'MICROSOFT_TOKEN_EXCHANGE_FAILED',
]);

export function isAuthApiError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  return error.status === 401 || AUTH_ERROR_CODES.has(error.code);
}

export function isSessionExpiryApiError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  return AUTH_ERROR_CODES.has(error.code);
}

function shouldAttemptTokenRefresh(error: ApiError): boolean {
  if (NON_SESSION_401_CODES.has(error.code)) return false;
  return isSessionExpiryApiError(error) || error.code === 'UNAUTHORIZED';
}

function shouldExpireSession(error: ApiError, hadCredentials: boolean): boolean {
  if (!hadCredentials || !shouldAttemptTokenRefresh(error)) return false;
  return isSessionExpiryApiError(error) || error.code === 'UNAUTHORIZED';
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  /** When true, a 401 after refresh failure will not clear JWT / notify session expiry. */
  suppressSessionExpiry?: boolean;
  /** Abort the request after this many milliseconds (e.g. long OCR / large attachment downloads). */
  timeoutMs?: number;
};

let expireSessionPromise: Promise<void> | null = null;
let refreshSessionPromise: Promise<RefreshOutcome> | null = null;

async function expireSession(): Promise<void> {
  if (!expireSessionPromise) {
    expireSessionPromise = (async () => {
      await clearAuthTokens();
      notifySessionExpired();
    })().finally(() => {
      expireSessionPromise = null;
    });
  }
  return expireSessionPromise;
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

function buildApiError(status: number, payload: ApiErrorBody): ApiError {
  return new ApiError(
    status,
    payload.code ?? 'REQUEST_FAILED',
    payload.message ?? `Request failed (${status})`,
    payload.retryAfterSeconds,
  );
}

function normalizeAccessToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^Bearer\s+/i, '').trim() || null;
}

function decodeJwtExpiryMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function accessTokenNeedsRefresh(token: string, skewMs = 60_000): boolean {
  const expiryMs = decodeJwtExpiryMs(token);
  if (expiryMs == null) return false;
  return expiryMs <= Date.now() + skewMs;
}

function isTransientRefreshFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 0) return true;
    if (error.status >= 500) return true;
    if (error.code === 'API_NOT_CONFIGURED' || error.code === 'REQUEST_FAILED') return true;
    return false;
  }
  return true;
}

function isDefinitiveAuthFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (NON_SESSION_401_CODES.has(error.code)) return false;
  return isSessionExpiryApiError(error);
}

type RefreshOutcome = 'refreshed' | 'auth_failed' | 'transient_failed';

type AccessTokenResolution = {
  token: string | null;
  refreshOutcome: RefreshOutcome | null;
};

/** Use stored access token, or refresh once before the first authenticated request. */
async function resolveAccessToken(): Promise<AccessTokenResolution> {
  const existing = normalizeAccessToken(await getAccessToken());
  if (existing) {
    if (!accessTokenNeedsRefresh(existing)) {
      return { token: existing, refreshOutcome: null };
    }
    const refreshed = await tryRefreshSession();
    if (refreshed === 'refreshed') {
      return { token: normalizeAccessToken(await getAccessToken()), refreshOutcome: refreshed };
    }
    if (refreshed === 'transient_failed') {
      return { token: existing, refreshOutcome: refreshed };
    }
    return { token: null, refreshOutcome: refreshed };
  }
  if (!(await getRefreshToken())) {
    return { token: null, refreshOutcome: null };
  }
  const refreshed = await tryRefreshSession();
  if (refreshed !== 'refreshed') {
    return { token: null, refreshOutcome: refreshed };
  }
  return { token: normalizeAccessToken(await getAccessToken()), refreshOutcome: refreshed };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(0, 'API_NOT_CONFIGURED', 'EXPO_PUBLIC_API_BASE_URL is not set');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': apiLanguageHeader(),
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const refreshBeforeRequest = options.auth !== false ? await getRefreshToken() : null;
  if (options.auth !== false) {
    const { token, refreshOutcome } = await resolveAccessToken();
    if (!token) {
      if (refreshBeforeRequest && refreshOutcome === 'auth_failed') {
        if (!options.suppressSessionExpiry) {
          await expireSession();
        }
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired');
      }
      if (refreshBeforeRequest && refreshOutcome === 'transient_failed') {
        throw new ApiError(0, 'REQUEST_FAILED', 'Unable to refresh session');
      }
      if (refreshBeforeRequest) {
        if (!options.suppressSessionExpiry) {
          await expireSession();
        }
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired');
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const hadAccessToken = Boolean(headers.Authorization);
  const hadCredentials = hadAccessToken || Boolean(refreshBeforeRequest);

  const controller = options.timeoutMs != null && options.timeoutMs > 0 ? new AbortController() : null;
  const timeoutId =
    controller != null
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller?.signal,
    });
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new ApiError(0, 'REQUEST_TIMEOUT', 'Request timed out');
    }
    throw error;
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }

  if (response.status === 401 && options.retryOnUnauthorized !== false && options.auth !== false) {
    const payload = await readErrorBody(response);
    const authError = buildApiError(401, payload);

    if (shouldAttemptTokenRefresh(authError)) {
      const refreshed = await tryRefreshSession();
      if (refreshed === 'refreshed') {
        return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
      }
      if (refreshed === 'auth_failed' && !options.suppressSessionExpiry) {
        await expireSession();
      }
      throw new ApiError(
        401,
        authError.code === 'UNAUTHORIZED' ? 'TOKEN_EXPIRED' : authError.code,
        authError.message || 'Session expired',
      );
    }

    throw authError;
  }

  if (!response.ok) {
    const payload = await readErrorBody(response);
    const error = buildApiError(response.status, payload);
    if (options.auth !== false && shouldExpireSession(error, hadCredentials) && !options.suppressSessionExpiry) {
      await expireSession();
    }
    throw error;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

type MultipartRequestOptions = {
  method?: string;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  suppressSessionExpiry?: boolean;
  timeoutMs?: number;
};

/** Multipart upload (e.g. contract PDF). Do not set Content-Type — fetch adds boundary. */
export async function apiMultipartRequest<T>(
  path: string,
  formData: FormData,
  options: MultipartRequestOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(0, 'API_NOT_CONFIGURED', 'EXPO_PUBLIC_API_BASE_URL is not set');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': apiLanguageHeader(),
  };

  const refreshBeforeRequest = options.auth !== false ? await getRefreshToken() : null;
  if (options.auth !== false) {
    const { token, refreshOutcome } = await resolveAccessToken();
    if (!token) {
      if (refreshBeforeRequest && refreshOutcome === 'auth_failed') {
        if (!options.suppressSessionExpiry) {
          await expireSession();
        }
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired');
      }
      if (refreshBeforeRequest && refreshOutcome === 'transient_failed') {
        throw new ApiError(0, 'REQUEST_FAILED', 'Unable to refresh session');
      }
      if (refreshBeforeRequest) {
        if (!options.suppressSessionExpiry) {
          await expireSession();
        }
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired');
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const hadAccessToken = Boolean(headers.Authorization);
  const hadCredentials = hadAccessToken || Boolean(refreshBeforeRequest);

  const controller = options.timeoutMs != null && options.timeoutMs > 0 ? new AbortController() : null;
  const timeoutId =
    controller != null
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? 'POST',
      headers,
      body: formData,
      signal: controller?.signal,
    });
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new ApiError(0, 'REQUEST_TIMEOUT', 'Request timed out');
    }
    throw error;
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }

  if (response.status === 401 && options.retryOnUnauthorized !== false && options.auth !== false) {
    const payload = await readErrorBody(response);
    const authError = buildApiError(401, payload);

    if (shouldAttemptTokenRefresh(authError)) {
      const refreshed = await tryRefreshSession();
      if (refreshed === 'refreshed') {
        return apiMultipartRequest<T>(path, formData, { ...options, retryOnUnauthorized: false });
      }
      if (refreshed === 'auth_failed' && !options.suppressSessionExpiry) {
        await expireSession();
      }
      throw new ApiError(
        401,
        authError.code === 'UNAUTHORIZED' ? 'TOKEN_EXPIRED' : authError.code,
        authError.message || 'Session expired',
      );
    }

    throw authError;
  }

  if (!response.ok) {
    const payload = await readErrorBody(response);
    const error = buildApiError(response.status, payload);
    if (options.auth !== false && shouldExpireSession(error, hadCredentials) && !options.suppressSessionExpiry) {
      await expireSession();
    }
    throw error;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function apiDownloadBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(0, 'API_NOT_CONFIGURED', 'EXPO_PUBLIC_API_BASE_URL is not set');
  }

  const headers: Record<string, string> = {
    Accept: '*/*',
    'Accept-Language': apiLanguageHeader(),
  };

  const refreshBeforeRequest = options.auth !== false ? await getRefreshToken() : null;
  if (options.auth !== false) {
    const { token, refreshOutcome } = await resolveAccessToken();
    if (!token) {
      if (refreshBeforeRequest && refreshOutcome === 'auth_failed') {
        if (!options.suppressSessionExpiry) {
          await expireSession();
        }
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired');
      }
      if (refreshBeforeRequest && refreshOutcome === 'transient_failed') {
        throw new ApiError(0, 'REQUEST_FAILED', 'Unable to refresh session');
      }
      if (refreshBeforeRequest) {
        if (!options.suppressSessionExpiry) {
          await expireSession();
        }
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired');
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${base}${path}`, {
    method: options.method ?? 'GET',
    headers,
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false && options.auth !== false) {
    const payload = await readErrorBody(response);
    const authError = buildApiError(401, payload);

    if (shouldAttemptTokenRefresh(authError)) {
      const refreshed = await tryRefreshSession();
      if (refreshed === 'refreshed') {
        return apiDownloadBlob(path, { ...options, retryOnUnauthorized: false });
      }
      if (refreshed === 'auth_failed' && !options.suppressSessionExpiry) {
        await expireSession();
      }
      throw new ApiError(
        401,
        authError.code === 'UNAUTHORIZED' ? 'TOKEN_EXPIRED' : authError.code,
        authError.message || 'Session expired',
      );
    }

    throw authError;
  }

  if (!response.ok) {
    const payload = await readErrorBody(response);
    throw buildApiError(response.status, payload);
  }

  return response.blob();
}

async function tryRefreshSession(): Promise<RefreshOutcome> {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = refreshSessionOnce().finally(() => {
    refreshSessionPromise = null;
  });
  return refreshSessionPromise;
}

async function refreshSessionOnce(): Promise<RefreshOutcome> {
  const refresh = await getRefreshToken();
  if (!refresh) return 'auth_failed';
  try {
    const session = await apiRequest<AuthSession>('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refresh },
      auth: false,
      retryOnUnauthorized: false,
    });
    const stillCurrent = (await getRefreshToken()) === refresh;
    if (!stillCurrent) {
      return (await getAccessToken()) ? 'refreshed' : 'auth_failed';
    }
    await setAuthTokens(session.accessToken, session.refreshToken);
    return 'refreshed';
  } catch (error) {
    if (isDefinitiveAuthFailure(error)) return 'auth_failed';
    if (isTransientRefreshFailure(error)) return 'transient_failed';
    return 'auth_failed';
  }
}
