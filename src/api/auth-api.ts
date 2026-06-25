import { apiRequest, isSessionExpiryApiError, ApiError } from '@/src/api/api-client';
import type { AuthSession } from '@/src/api/auth-types';
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from '@/src/auth/token-storage';

export type RegisterResponse = {
  email: string;
  message: string;
};

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: {
      email: input.email,
      password: input.password,
      displayName: input.displayName ?? null,
    },
    auth: false,
  });
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/v1/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
  await setAuthTokens(session.accessToken, session.refreshToken);
  return session;
}

export async function restoreSession(): Promise<AuthSession | null> {
  const refresh = await getRefreshToken();
  if (!refresh) {
    return null;
  }
  try {
    const session = await apiRequest<AuthSession>('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refresh },
      auth: false,
      retryOnUnauthorized: false,
    });
    const stillCurrent = (await getRefreshToken()) === refresh;
    if (!stillCurrent) {
      return null;
    }
    await setAuthTokens(session.accessToken, session.refreshToken);
    return session;
  } catch (error) {
    const stillCurrent = (await getRefreshToken()) === refresh;
    if (!stillCurrent) {
      return null;
    }
    if (error instanceof ApiError && isSessionExpiryApiError(error)) {
      await clearAuthTokens();
    }
    return null;
  }
}

export async function fetchMe(): Promise<AuthSession> {
  const me = await apiRequest<{
    user: AuthSession['user'];
    activeTenant: AuthSession['activeTenant'];
    membershipRole: string;
    agentSendMode: AuthSession['agentSendMode'];
    creatorFocusMode: AuthSession['creatorFocusMode'];
  }>('/api/v1/auth/me');

  const access = await getAccessToken();
  const refresh = await getRefreshToken();

  return {
    accessToken: access ?? '',
    refreshToken: refresh ?? '',
    accessExpiresInSeconds: 0,
    user: me.user,
    activeTenant: me.activeTenant,
    membershipRole: me.membershipRole,
    agentSendMode: me.agentSendMode,
    creatorFocusMode: me.creatorFocusMode,
  };
}

export async function loginWithGoogle(idToken: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/v1/auth/oauth/google', {
    method: 'POST',
    body: { idToken },
    auth: false,
  });
  await setAuthTokens(session.accessToken, session.refreshToken);
  return session;
}

export async function loginWithGoogleAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId?: string;
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/v1/auth/oauth/google', {
    method: 'POST',
    body: input,
    auth: false,
  });
  await setAuthTokens(session.accessToken, session.refreshToken);
  return session;
}

export async function loginWithMicrosoft(accessToken: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/v1/auth/oauth/microsoft', {
    method: 'POST',
    body: { accessToken },
    auth: false,
  });
  await setAuthTokens(session.accessToken, session.refreshToken);
  return session;
}

/** Web flow: sends the authorization code to the backend for server-side exchange with client_secret. */
export async function loginWithMicrosoftAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/v1/auth/oauth/microsoft', {
    method: 'POST',
    body: input,
    auth: false,
  });
  await setAuthTokens(session.accessToken, session.refreshToken);
  return session;
}

export type ForgotPasswordOutcome =
  | 'RESET_EMAIL_SENT'
  | 'OAUTH_ONLY'
  | 'EMAIL_NOT_FOUND'
  | 'ACCOUNT_DISABLED'
  | 'RATE_LIMITED';

export type ForgotPasswordResponse = {
  outcome: ForgotPasswordOutcome;
  message: string;
};

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export async function validateResetToken(token: string): Promise<{ valid: boolean }> {
  return apiRequest<{ valid: boolean }>('/api/v1/auth/validate-reset-token', {
    method: 'POST',
    body: { token },
    auth: false,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
    auth: false,
  });
}

export type ResendRegistrationCodeOutcome =
  | 'REGISTRATION_CODE_SENT'
  | 'EMAIL_TAKEN'
  | 'NO_PENDING_REGISTRATION'
  | 'RATE_LIMITED';

export type ResendRegistrationCodeResponse = {
  outcome: ResendRegistrationCodeOutcome;
  message: string;
};

export async function completeRegistration(email: string, code: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/v1/auth/register/complete', {
    method: 'POST',
    body: { email, code },
    auth: false,
  });
  await setAuthTokens(session.accessToken, session.refreshToken);
  return session;
}

export async function resendRegistrationCode(email: string): Promise<ResendRegistrationCodeResponse> {
  return apiRequest<ResendRegistrationCodeResponse>('/api/v1/auth/register/resend-code', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export async function logoutAccount(): Promise<void> {
  const refresh = await getRefreshToken();
  if (refresh) {
    try {
      await apiRequest<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: { refreshToken: refresh },
        auth: false,
      });
    } catch {
      // best-effort revoke
    }
  }
  await clearAuthTokens();
}
