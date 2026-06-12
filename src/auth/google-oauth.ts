import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import { Platform } from 'react-native';

import { getAppScheme, OAUTH_CALLBACK_PATH } from '@/src/auth/oauth-redirect';

/**
 * Web: localhost root (matches typical Google Console redirect URIs).
 * Native: deep link with oauth callback path.
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

/** Web uses authorization code + PKCE; code is exchanged on the backend (needs client_secret). */
export function getGoogleAuthRequestConfig(base: Record<string, unknown>) {
  if (Platform.OS !== 'web') {
    return base;
  }
  return {
    ...base,
    responseType: ResponseType.Code,
    usePKCE: true,
    // Web OAuth clients need client_secret — exchange on backend only (see loginWithGoogleAuthCode).
    shouldAutoExchangeCode: false,
  };
}

export type GoogleAuthCodePayload = {
  code: string;
  redirectUri: string;
  codeVerifier: string;
};
