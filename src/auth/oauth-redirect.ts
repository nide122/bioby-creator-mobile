import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

/** App deep-link scheme from `app.json` / `app.config.ts`. */
export function getAppScheme(): string {
  const scheme = Constants.expoConfig?.scheme;
  return typeof scheme === 'string' && scheme.trim().length > 0 ? scheme.trim() : 'bioby-creator';
}

/** Shared OAuth callback path registered in Google / Microsoft consoles. */
export const OAUTH_CALLBACK_PATH = 'oauth/callback';

export function getMicrosoftOAuthRedirectUri(variant: 'login' | 'mailbox'): string {
  // On web, the redirect URI must point to a page that calls maybeCompleteAuthSession()
  // so the popup can send the auth code back to the parent window via postMessage.
  return AuthSession.makeRedirectUri({
    scheme: getAppScheme(),
    path: variant === 'mailbox' ? 'oauth/microsoft/mail' : OAUTH_CALLBACK_PATH,
    preferLocalhost: Platform.OS === 'web',
  });
}

/** Useful when registering redirect URIs in Google / Microsoft consoles. */
export function getOAuthRedirectUriHints(): {
  scheme: string;
  googleWebRoot: string;
  googleNativeCallback: string;
  microsoftMailbox: string;
} {
  const scheme = getAppScheme();
  return {
    scheme,
    googleWebRoot: AuthSession.makeRedirectUri({ preferLocalhost: true }),
    googleNativeCallback: AuthSession.makeRedirectUri({ scheme, path: OAUTH_CALLBACK_PATH }),
    microsoftMailbox: AuthSession.makeRedirectUri({
      scheme,
      path: 'oauth/microsoft/mail',
      preferLocalhost: true,
    }),
  };
}
