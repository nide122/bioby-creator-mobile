import Constants from 'expo-constants';

import { getApiBaseUrl } from '@/src/api/api-config';

function readEnv(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (typeof fromProcess === 'string' && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.[key];
  return typeof fromExtra === 'string' && fromExtra.trim().length > 0 ? fromExtra.trim() : undefined;
}

const LOCAL_WEB_DEFAULT = 'http://localhost:8081';

function getExpoDevServerOrigin(): string | undefined {
  const expoGoConfig = (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig;
  const hostUri = expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri;
  if (typeof hostUri !== 'string' || !hostUri.trim()) return undefined;
  const host = hostUri.split('/')[0]?.trim();
  if (!host) return undefined;
  return `http://${host}`;
}

function deriveFromApiBaseUrl(apiBase: string): string | undefined {
  try {
    const url = new URL(apiBase);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return `${url.protocol}//${url.hostname}:8081`;
    }
    if (url.hostname.startsWith('api.')) {
      return `${url.protocol}//${url.hostname.slice(4)}`;
    }
  } catch {
    // ignore invalid URL
  }
  return undefined;
}

/** Public web origin for brand-facing Media Kit links (`/c/{slug}`). */
export function getPublicWebBaseUrl(): string {
  const configured = readEnv('EXPO_PUBLIC_PUBLIC_WEB_BASE_URL');
  if (configured) return configured.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  const expoDev = getExpoDevServerOrigin();
  if (expoDev) return expoDev;

  const apiBase = getApiBaseUrl() ?? readEnv('EXPO_PUBLIC_API_BASE_URL');
  if (apiBase) {
    const derived = deriveFromApiBaseUrl(apiBase);
    if (derived) return derived;
  }

  return LOCAL_WEB_DEFAULT;
}
