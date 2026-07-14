import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import type { AccountOverviewResponse } from '@/src/api/account-api';
import { fetchAccountOverview } from '@/src/api/account-api';
import type { AuthSession } from '@/src/api/auth-types';
import { createTenant, switchTenant } from '@/src/api/tenants-api';
import { useCreateTenant, useSwitchTenant } from '@/src/hooks/use-tenants';
import { useSessionStore } from '@/src/stores/session-store';

jest.mock('@/src/api/tenants-api');
jest.mock('@/src/api/account-api');

const mockedSwitchTenant = switchTenant as jest.MockedFunction<typeof switchTenant>;
const mockedCreateTenant = createTenant as jest.MockedFunction<typeof createTenant>;
const mockedFetchOverview = fetchAccountOverview as jest.MockedFunction<typeof fetchAccountOverview>;

const mockSession: AuthSession = {
  accessToken: 'access',
  refreshToken: 'refresh',
  accessExpiresInSeconds: 3600,
  user: { id: 'u1', email: 'user@example.com', displayName: 'User' },
  activeTenant: { id: 'tenant-b', type: 'PERSONAL', displayName: 'Workspace B', planCode: 'FREE' },
  membershipRole: 'OWNER',
  agentSendMode: 'agent_assist',
  creatorFocusMode: 'quiet',
};

const tenantMembership = {
  tenantPublicId: 'tenant-b',
  tenantType: 'PERSONAL',
  displayName: 'Workspace B',
  planCode: 'FREE',
  role: 'OWNER',
  status: 'ACTIVE',
  active: true,
};

const baseOverview: AccountOverviewResponse = {
  profile: {
    displayName: 'Mia',
    bio: 'Skincare',
    nicheTags: ['Skincare'],
    platforms: ['TikTok'],
  },
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
    connected: true,
    emailAddress: 'creator@example.com',
    provider: 'google',
    status: 'active',
  },
  tenantDisplayName: 'Workspace B',
  tenantType: 'PERSONAL',
  agentSendMode: 'agent_assist',
  creatorFocusMode: 'quiet',
};

let queryClient: QueryClient;

function Wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSwitchTenant', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    useSessionStore.getState().clearLocalSession();
    useSessionStore.setState({
      isAuthenticated: true,
      onboardingComplete: true,
      emailSkipped: false,
      emailWizardFinished: true,
      complianceAcceptedAt: '2026-06-01T00:00:00.000Z',
    });
    mockedSwitchTenant.mockResolvedValue(mockSession);
    mockedCreateTenant.mockResolvedValue(mockSession);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('restores onboardingComplete for an onboarded tenant', async () => {
    mockedFetchOverview.mockResolvedValue({
      ...baseOverview,
      onboardingCompletedAt: '2026-06-09T12:00:00.000Z',
    });

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(tenantMembership);
    });

    const s = useSessionStore.getState();
    expect(s.tenantPublicId).toBe('tenant-b');
    expect(s.tenantDisplayName).toBe('Workspace B');
    expect(s.onboardingComplete).toBe(true);
    expect(mockedFetchOverview).toHaveBeenCalledTimes(1);
  });

  it('clears onboardingComplete for a tenant without profile', async () => {
    mockedFetchOverview.mockResolvedValue({
      ...baseOverview,
      profile: null,
      mailbox: { connected: false, emailAddress: null, provider: null, status: null },
      onboardingCompletedAt: null,
    });

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(tenantMembership);
    });

    expect(useSessionStore.getState().onboardingComplete).toBe(false);
  });

  it('invalidates tenant-scoped queries after switch', async () => {
    mockedFetchOverview.mockResolvedValue({
      ...baseOverview,
      onboardingCompletedAt: '2026-06-09T12:00:00.000Z',
    });
    queryClient.setQueryData(['tenant', 'tenant-a', 'inbox', 'threads'], [{ id: 'old' }]);

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(tenantMembership);
    });

    expect(queryClient.getQueryData(['tenant', 'tenant-a', 'inbox', 'threads'])).toEqual([{ id: 'old' }]);
    expect(queryClient.getQueryState(['tenant', 'tenant-a', 'inbox', 'threads'])?.isInvalidated).toBe(true);
  });

  it('restores skip-inbox state from overview', async () => {
    mockedFetchOverview.mockResolvedValue({
      ...baseOverview,
      mailbox: { connected: false, emailAddress: null, provider: null, status: null },
      inboxSetupSkipped: true,
      onboardingCompletedAt: '2026-06-09T12:00:00.000Z',
    });

    const { result } = renderHook(() => useSwitchTenant(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(tenantMembership);
    });

    const s = useSessionStore.getState();
    expect(s.emailSkipped).toBe(true);
    expect(s.emailWizardFinished).toBe(true);
    expect(s.onboardingComplete).toBe(true);
  });

  it('creates a workspace, applies its session, and invalidates tenant caches', async () => {
    mockedFetchOverview.mockResolvedValue({
      ...baseOverview,
      profile: null,
      mailbox: { connected: false, emailAddress: null, provider: null, status: null },
      onboardingCompletedAt: null,
    });
    queryClient.setQueryData(['tenant', 'tenant-a', 'inbox', 'threads'], [{ id: 'old' }]);

    const { result } = renderHook(() => useCreateTenant(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('Workspace B');
    });

    expect(mockedCreateTenant).toHaveBeenCalledWith('Workspace B');
    expect(useSessionStore.getState().tenantPublicId).toBe('tenant-b');
    expect(useSessionStore.getState().onboardingComplete).toBe(false);
    expect(queryClient.getQueryState(['tenant', 'tenant-a', 'inbox', 'threads'])?.isInvalidated).toBe(true);
  });
});
