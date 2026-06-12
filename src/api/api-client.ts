import { getApiBaseUrl } from '@/src/api/api-config';
import { apiLanguageHeader } from '@/src/i18n';
import type { ApiErrorBody } from '@/src/api/auth-types';
import { notifySessionExpired } from '@/src/auth/auth-session-events';
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from '@/src/auth/token-storage';
import type { AuthSession } from '@/src/api/auth-types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const AUTH_ERROR_CODES = new Set([
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'TOKEN_REVOKED',
  'REFRESH_EXPIRED',
  'INVALID_REFRESH',
]);

export function isAuthApiError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  return error.status === 401 || AUTH_ERROR_CODES.has(error.code);
}

export function isSessionExpiryApiError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  return AUTH_ERROR_CODES.has(error.code);
}

function shouldExpireSession(error: ApiError, hadCredentials: boolean): boolean {
  if (!hadCredentials) return false;
  return isSessionExpiryApiError(error);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

let expireSessionPromise: Promise<void> | null = null;
let refreshSessionPromise: Promise<boolean> | null = null;

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
    payload.message ?? `Request failed (${status})`
  );
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
  if (options.auth !== false) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const hadAccessToken = Boolean(headers.Authorization);
  const refreshBeforeRequest = options.auth !== false ? await getRefreshToken() : null;
  const hadCredentials = hadAccessToken || Boolean(refreshBeforeRequest);

  const response = await fetch(`${base}${path}`, {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false && options.auth !== false) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
    if (hadCredentials) {
      await expireSession();
    }
    const payload = await readErrorBody(response);
    throw buildApiError(401, {
      code: payload.code ?? 'TOKEN_EXPIRED',
      message: payload.message ?? 'Session expired',
    });
  }

  if (!response.ok) {
    const payload = await readErrorBody(response);
    const error = buildApiError(response.status, payload);
    if (options.auth !== false && shouldExpireSession(error, hadCredentials)) {
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

async function tryRefreshSession(): Promise<boolean> {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = refreshSessionOnce().finally(() => {
    refreshSessionPromise = null;
  });
  return refreshSessionPromise;
}

async function refreshSessionOnce(): Promise<boolean> {
  const refresh = await getRefreshToken();
  if (!refresh) return false;
  try {
    const session = await apiRequest<AuthSession>('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refresh },
      auth: false,
      retryOnUnauthorized: false,
    });
    const stillCurrent = (await getRefreshToken()) === refresh;
    if (!stillCurrent) {
      return Boolean(await getAccessToken());
    }
    await setAuthTokens(session.accessToken, session.refreshToken);
    return true;
  } catch {
    return false;
  }
}
