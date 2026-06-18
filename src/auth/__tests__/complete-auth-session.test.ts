import { completeAuthSession } from '@/src/auth/complete-auth-session';
import { fetchAccountOverview } from '@/src/api/account-api';
import { useSessionStore } from '@/src/stores/session-store';

jest.mock('@/src/api/api-config', () => ({
  isApiConfigured: jest.fn(() => true),
}));

jest.mock('@/src/api/should-use-backend-api', () => ({
  shouldUseBackendApi: jest.fn(() => true),
}));

jest.mock('@/src/api/account-api', () => ({
  fetchAccountOverview: jest.fn(),
}));

const mockedFetchOverview = fetchAccountOverview as jest.MockedFunction<typeof fetchAccountOverview>;

const session = {
  accessToken: 'access',
  refreshToken: 'refresh',
  accessExpiresInSeconds: 3600,
  user: { id: '1', email: 'creator@outlook.com', displayName: 'Creator' },
  activeTenant: { id: 'tenant-1', displayName: 'Personal', planCode: 'FREE' },
  membershipRole: 'OWNER',
  agentSendMode: 'agent_assist' as const,
};

describe('completeAuthSession', () => {
  beforeEach(() => {
    useSessionStore.getState().clearLocalSession();
    mockedFetchOverview.mockReset();
  });

  it('applies auth session then hydrates onboarding state from overview', async () => {
    mockedFetchOverview.mockResolvedValue({
      profile: null,
      subscription: {
        planName: 'Free',
        billingCycleLabel: 'Monthly',
        brandPitchesUsed: 0,
        brandPitchesLimit: 10,
        draftConcurrentUsed: 0,
        draftConcurrentLimit: 3,
        renewalHint: 'Renewal',
      },
      mailbox: {
        connected: false,
        emailAddress: null,
        provider: null,
        status: null,
      },
      tenantDisplayName: 'Personal',
      tenantType: 'PERSONAL',
      agentSendMode: 'agent_assist',
      creatorFocusMode: 'quiet',
      onboardingCompletedAt: '2026-06-09T12:00:00.000Z',
    });

    await completeAuthSession(session);

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accountEmail).toBe('creator@outlook.com');
    expect(state.onboardingComplete).toBe(true);
  });

  it('keeps JWT auth when overview hydration fails', async () => {
    mockedFetchOverview.mockRejectedValue(new Error('network'));

    await completeAuthSession(session);

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.onboardingComplete).toBe(false);
  });
});
