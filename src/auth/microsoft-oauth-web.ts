import { Platform } from 'react-native';

import { loginWithMicrosoftAuthCode } from '@/src/api/auth-api';
import { connectMailboxMicrosoftOAuthCode } from '@/src/api/account-api';
import { isApiConfigured } from '@/src/api/api-config';
import { useSessionStore } from '@/src/stores/session-store';

const MICROSOFT_WEB_KEY = 'microsoft_oauth_web';

export type MicrosoftWebState = {
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  scopes: string[];
  variant: 'login' | 'mailbox';
  discoveryUrl: string;
};

/** Saved before redirect so the callback page can pick it up. */
export function saveMicrosoftWebState(state: MicrosoftWebState): void {
  if (Platform.OS !== 'web') return;
  try {
    sessionStorage.setItem(MICROSOFT_WEB_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function loadMicrosoftWebState(): MicrosoftWebState | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = sessionStorage.getItem(MICROSOFT_WEB_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MicrosoftWebState;
  } catch {
    return null;
  }
}

export function clearMicrosoftWebState(): void {
  if (Platform.OS !== 'web') return;
  try {
    sessionStorage.removeItem(MICROSOFT_WEB_KEY);
  } catch {
    // ignore
  }
}

/**
 * Called from the OAuth callback page on web after Microsoft redirects back.
 * Sends the auth code to the backend for server-side exchange with client_secret.
 */
export async function handleMicrosoftWebCallback(code: string): Promise<
  | { ok: true; email: string }
  | { ok: false; error: string }
> {
  const saved = loadMicrosoftWebState();
  if (!saved) {
    return { ok: false, error: 'microsoft_missing_session_state' };
  }

  clearMicrosoftWebState();

  if (!saved.codeVerifier) {
    return { ok: false, error: 'microsoft_missing_code_verifier' };
  }

  const apiMode = isApiConfigured();

  if (saved.variant === 'login') {
    if (apiMode) {
      // Send auth code to backend — backend exchanges with client_secret.
      try {
        const session = await loginWithMicrosoftAuthCode({
          code,
          redirectUri: saved.redirectUri,
          codeVerifier: saved.codeVerifier,
        });
        // Apply the session to the zustand store so the app recognizes the user.
        useSessionStore.getState().applyAuthSession(session);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'microsoft_backend_error' };
      }
      return { ok: true, email: '' };
    }

    // Demo mode (no API): can't exchange code without backend, fail gracefully.
    return { ok: false, error: 'microsoft_api_required_for_web' };
  }

  // Mailbox variant
  if (apiMode) {
    try {
      await connectMailboxMicrosoftOAuthCode({
        code,
        redirectUri: saved.redirectUri,
        codeVerifier: saved.codeVerifier,
      });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'microsoft_mailbox_backend_error' };
    }
  }

  return { ok: true, email: '' };
}
