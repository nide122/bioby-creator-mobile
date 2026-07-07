import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { isApiConfigured } from '@/src/api/api-config';
import {
  completeRegistration,
  loginAccount,
  loginWithGoogle,
  loginWithGoogleAuthCode,
  loginWithMicrosoft,
  logoutAccount,
  registerAccount,
} from '@/src/api/auth-api';
import type { GoogleAuthCodePayload } from '@/src/auth/google-oauth';
import { completeAuthSession } from '@/src/auth/complete-auth-session';
import { resolveAuthApiErrorMessage } from '@/src/auth/auth-api-errors';
import { clearAllQueries, invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import { revokeRegisteredPushDevice } from '@/src/push/register-push-device';
import { useSessionStore } from '@/src/stores/session-store';

async function hydrateAfterAuth(
  queryClient: ReturnType<typeof useQueryClient>,
  session: Parameters<typeof completeAuthSession>[0],
) {
  await completeAuthSession(session);
  try {
    await invalidateTenantScopedQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] });
  } catch {
    // Query cache refresh is best-effort after auth.
  }
}

export function useAuthActions() {
  const queryClient = useQueryClient();
  const signInDemo = useSessionStore((s) => s.signInDemo);
  const clearLocalSession = useSessionStore((s) => s.clearLocalSession);
  const [loading, setLoading] = useState(false);

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      if (!isApiConfigured()) {
        signInDemo(input.email, { displayNameHint: input.displayName });
        return { ok: true as const, requiresVerification: false as const };
      }
      setLoading(true);
      try {
        const response = await registerAccount(input);
        return { ok: true as const, requiresVerification: true as const, email: response.email };
      } catch (err) {
        const message = resolveAuthApiErrorMessage(err, 'auth.register.errors.submit');
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [signInDemo]
  );

  const completeRegister = useCallback(
    async (input: { email: string; code: string }) => {
      if (!isApiConfigured()) {
        return { ok: false as const, message: resolveAuthApiErrorMessage(null, 'auth.apiErrors.API_NOT_CONFIGURED') };
      }
      setLoading(true);
      try {
        const session = await completeRegistration(input.email, input.code);
        await hydrateAfterAuth(queryClient, session);
        return { ok: true as const };
      } catch (err) {
        const message = resolveAuthApiErrorMessage(err, 'auth.verifyEmailPending.errors.verify');
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
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
        await hydrateAfterAuth(queryClient, session);
        return { ok: true as const };
      } catch (err) {
        const message = resolveAuthApiErrorMessage(err, 'auth.login.errors.submit');
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [queryClient, signInDemo]
  );

  const loginMicrosoft = useCallback(
    async (accessToken: string) => {
      if (!isApiConfigured()) {
        return { ok: false as const, message: resolveAuthApiErrorMessage(null, 'auth.apiErrors.API_NOT_CONFIGURED') };
      }
      setLoading(true);
      try {
        const session = await loginWithMicrosoft(accessToken);
        await hydrateAfterAuth(queryClient, session);
        return { ok: true as const };
      } catch (err) {
        const message = resolveAuthApiErrorMessage(err, 'auth.login.errors.microsoft');
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
  );

  const loginGoogle = useCallback(
    async (idToken: string) => {
      if (!isApiConfigured()) {
        return { ok: false as const, message: resolveAuthApiErrorMessage(null, 'auth.apiErrors.API_NOT_CONFIGURED') };
      }
      setLoading(true);
      try {
        const session = await loginWithGoogle(idToken);
        await hydrateAfterAuth(queryClient, session);
        return { ok: true as const };
      } catch (err) {
        const message = resolveAuthApiErrorMessage(err, 'auth.login.errors.google');
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
  );

  const loginGoogleWithAuthCode = useCallback(
    async (payload: GoogleAuthCodePayload) => {
      if (!isApiConfigured()) {
        return { ok: false as const, message: resolveAuthApiErrorMessage(null, 'auth.apiErrors.API_NOT_CONFIGURED') };
      }
      setLoading(true);
      try {
        const session = await loginWithGoogleAuthCode(payload);
        await hydrateAfterAuth(queryClient, session);
        return { ok: true as const };
      } catch (err) {
        const message = resolveAuthApiErrorMessage(err, 'auth.login.errors.google');
        return { ok: false as const, message };
      } finally {
        setLoading(false);
      }
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    await revokeRegisteredPushDevice();
    if (isApiConfigured()) {
      await logoutAccount();
    }
    clearAllQueries(queryClient);
    clearLocalSession();
  }, [clearLocalSession, queryClient]);

  return {
    register,
    completeRegister,
    login,
    loginGoogle,
    loginGoogleWithAuthCode,
    loginMicrosoft,
    signOut,
    loading,
    apiMode: isApiConfigured(),
  };
}
