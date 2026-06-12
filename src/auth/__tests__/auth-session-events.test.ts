import { notifySessionExpired, onSessionExpired } from '@/src/auth/auth-session-events';
import { ApiError, isAuthApiError, isSessionExpiryApiError } from '@/src/api/api-client';

describe('isAuthApiError', () => {
  it('detects 401 responses', () => {
    expect(isAuthApiError(new ApiError(401, 'REQUEST_FAILED', 'Unauthorized'))).toBe(true);
  });

  it('detects known auth error codes', () => {
    expect(isAuthApiError(new ApiError(500, 'TOKEN_EXPIRED', 'Access token expired'))).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isAuthApiError(new ApiError(500, 'INTERNAL_ERROR', 'Server error'))).toBe(false);
    expect(isAuthApiError(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'))).toBe(true);
    expect(isAuthApiError(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'))).toBe(true);
    expect(isAuthApiError(new Error('network'))).toBe(false);
  });
});

describe('isSessionExpiryApiError', () => {
  it('only detects explicit token/session expiry errors', () => {
    expect(isSessionExpiryApiError(new ApiError(401, 'TOKEN_EXPIRED', 'Access token expired'))).toBe(true);
    expect(isSessionExpiryApiError(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'))).toBe(false);
    expect(isSessionExpiryApiError(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'))).toBe(false);
  });
});

describe('auth session events', () => {
  it('notifies listeners once per expiry wave', () => {
    const listener = jest.fn();
    const unsubscribe = onSessionExpired(listener);

    notifySessionExpired();
    notifySessionExpired();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
