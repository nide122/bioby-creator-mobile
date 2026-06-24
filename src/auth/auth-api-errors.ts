import { ApiError } from '@/src/api/api-client';
import i18n from '@/src/i18n';

const AUTH_API_ERROR_KEYS: Record<string, string> = {
  INVALID_CREDENTIALS: 'auth.apiErrors.INVALID_CREDENTIALS',
  EMAIL_TAKEN: 'auth.apiErrors.EMAIL_TAKEN',
  VERIFICATION_CODE_INVALID: 'auth.apiErrors.VERIFICATION_CODE_INVALID',
  RATE_LIMITED: 'auth.apiErrors.RATE_LIMITED',
  USER_DISABLED: 'auth.apiErrors.USER_DISABLED',
  RESET_TOKEN_INVALID: 'auth.apiErrors.RESET_TOKEN_INVALID',
  WEAK_PASSWORD: 'auth.apiErrors.WEAK_PASSWORD',
  REQUEST_FAILED: 'auth.apiErrors.REQUEST_FAILED',
  API_NOT_CONFIGURED: 'auth.apiErrors.API_NOT_CONFIGURED',
  MISSING_GOOGLE_CREDENTIAL: 'auth.apiErrors.MISSING_GOOGLE_CREDENTIAL',
  MISSING_MS_CREDENTIAL: 'auth.apiErrors.MISSING_MS_CREDENTIAL',
  GOOGLE_TOKEN_EXCHANGE_FAILED: 'auth.apiErrors.GOOGLE_TOKEN_EXCHANGE_FAILED',
  OAUTH_NOT_CONFIGURED: 'auth.apiErrors.OAUTH_NOT_CONFIGURED',
};

export function resolveAuthApiErrorMessage(error: unknown, fallbackKey: string): string {
  if (error instanceof ApiError) {
    const key = AUTH_API_ERROR_KEYS[error.code];
    if (key) {
      return i18n.t(key);
    }
  }
  return i18n.t(fallbackKey);
}
