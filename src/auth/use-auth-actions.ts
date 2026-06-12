import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { isApiConfigured } from '@/src/api/api-config';
import { ApiError } from '@/src/api/api-client';
import {
  loginAccount,
  loginWithGoogle,
  loginWithGoogleAuthCode,
  loginWithMicrosoft,
  logoutAccount,
  registerAccount,
} from '@/src/api/auth-api';
import type { GoogleAuthCodePayload } from '@/src/auth/google-oauth';
import { hydrateSessionFromBackend } from '@/src/hooks/use-account-overview';
import { clearAllQueries, invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { useSessionStore } from '@/src/stores/session-store';

async function hydrateAfterAuth(queryClient: ReturnType<typeof useQueryClient>) {
  try {
    await hydrateSessionFromBackend();
    await invalidateTenantScopedQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] });
  } catch {
    // Keep JWT auth; overview can retry later.
  }
}

export function useAuthActions() {
  const queryClient = useQueryClient();
  const applyAuthSession = useSessionStore((s) => s.applyAuthSession);
  const signInDemo = useSessionStore((s) => s.signInDemo);
  const clearLocalSession = useSessionStore((s) => s.clearLocalSession);
  const [loading, setLoading] = useState(false);

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      if (!isApiConfigured()) {
        signInDemo(input.email, { displayNameHint: input.displayName });
        return { ok: true as const };
      }
      setLoading(true);
      try {
        const session = await registerAccount(input);
        applyAuthSession(session);
        await hydrateAfterAuth(queryClient);
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Registration failed';
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [applyAuthSession, queryClient, signInDemo]
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      if (!isApiConfigured()) {
        signInDemo(input.email);
        return { ok: true as const };
      }
      setLoading(true);
      try {
        const session = await loginAccount(input);
        applyAuthSession(session);
        await hydrateAfterAuth(queryClient);
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Sign-in failed';
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [applyAuthSession, queryClient, signInDemo]
  );

  const loginMicrosoft = useCallback(
    async (accessToken: string) => {
      if (!isApiConfigured()) {
        return { ok: false as const, message: 'API not configured' };
      }
      setLoading(true);
      try {
        const session = await loginWithMicrosoft(accessToken);
        applyAuthSession(session);
        await hydrateAfterAuth(queryClient);
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Microsoft sign-in failed';
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [applyAuthSession, queryClient]
  );

  const loginGoogle = useCallback(
    async (idToken: string) => {
      if (!isApiConfigured()) {
        return { ok: false as const, message: 'API not configured' };
      }
      setLoading(true);
      try {
        const session = await loginWithGoogle(idToken);
        applyAuthSession(session);
        await hydrateAfterAuth(queryClient);
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Google sign-in failed';
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [applyAuthSession, queryClient]
  );

  const loginGoogleWithAuthCode = useCallback(
    async (payload: GoogleAuthCodePayload) => {
      if (!isApiConfigured()) {
        return { ok: false as const, message: 'API not configured' };
      }
      setLoading(true);
      try {
        const session = await loginWithGoogleAuthCode(payload);
        applyAuthSession(session);
        await hydrateAfterAuth(queryClient);
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Google sign-in failed';
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [applyAuthSession, queryClient]
  );

  const signOut = useCallback(async () => {
    if (isApiConfigured()) {
      await logoutAccount();
    }
    clearAllQueries(queryClient);
    clearLocalSession();
  }, [clearLocalSession, queryClient]);

  return {
    register,
    login,
    loginGoogle,
    loginGoogleWithAuthCode,
    loginMicrosoft,
    signOut,
    loading,
    apiMode: isApiConfigured(),
  };
}
