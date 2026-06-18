import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import { Platform } from 'react-native';

import { getAppScheme, OAUTH_CALLBACK_PATH } from '@/src/auth/oauth-redirect';

/**
 * Web: localhost root, matching the Expo web origin registered in Google Console.
 * Native: app deep link with the shared OAuth callback path.
 */
export function getGoogleOAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    return makeRedirectUri({ preferLocalhost: true });
  }
  return makeRedirectUri({
    scheme: getAppScheme(),
    path: OAUTH_CALLBACK_PATH,
  });
}

/** Web uses authorization code + PKCE; the code is exchanged on the backend. */
export function getGoogleAuthRequestConfig(base: Record<string, unknown>) {
  if (Platform.OS !== 'web') {
    return base;
  }
  return {
    ...base,
    responseType: ResponseType.Code,
    usePKCE: true,
    shouldAutoExchangeCode: false,
  };
}

/** Google redirect URIs must match GCP registration exactly (no trailing slash on origin-only URIs). */
export function normalizeOAuthRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  if (/^https?:\/\/[^/]+\/$/.test(trimmed)) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

export type GoogleAuthCodePayload = {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId?: string;
};
