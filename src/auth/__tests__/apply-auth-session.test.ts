import { mapAuthSessionToStore } from '@/src/auth/apply-auth-session';

describe('mapAuthSessionToStore', () => {
  it('maps backend session into session-store shape', () => {
    const mapped = mapAuthSessionToStore({
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresInSeconds: 1800,
      user: { id: 'u1', email: 'c@example.com', displayName: 'Mia' },
      activeTenant: { id: 't1', type: 'PERSONAL', displayName: 'Mia', planCode: 'FREE' },
      membershipRole: 'OWNER',
      agentSendMode: 'review_only',
      creatorFocusMode: 'work',
    });
    expect(mapped.isAuthenticated).toBe(true);
    expect(mapped.accountEmail).toBe('c@example.com');
    expect(mapped.tenantPublicId).toBe('t1');
    expect(mapped.tenantDisplayName).toBe('Mia');
    expect(mapped.agentSendMode).toBe('review_only');
    expect(mapped.creatorFocusMode).toBe('work');
  });
});
