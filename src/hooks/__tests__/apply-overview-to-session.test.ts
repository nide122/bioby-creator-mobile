import type { AccountOverviewResponse } from '@/src/api/account-api';
import {
  applyOverviewToSession,
  inferOnboardingComplete,
  replaceTenantOnboardingFromOverview,
} from '@/src/hooks/use-account-overview';
import { useSessionStore } from '@/src/stores/session-store';

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
  tenantDisplayName: 'Personal',
  tenantType: 'PERSONAL',
  agentSendMode: 'agent_assist',
  creatorFocusMode: 'quiet',
};

describe('inferOnboardingComplete', () => {
  it('returns true when onboardingCompletedAt is set', () => {
    expect(
      inferOnboardingComplete({
        ...baseOverview,
        profile: null,
        mailbox: { connected: false, emailAddress: null, provider: null, status: null },
        onboardingCompletedAt: '2026-06-09T12:00:00.000Z',
      })
    ).toBe(true);
  });

  it('returns true for profile + consent + connected mailbox', () => {
    expect(inferOnboardingComplete(baseOverview)).toBe(true);
  });

  it('returns true when inbox was skipped on the server', () => {
    expect(
      inferOnboardingComplete({
        ...baseOverview,
        mailbox: { connected: false, emailAddress: null, provider: null, status: null },
        inboxSetupSkipped: true,
      })
    ).toBe(true);
  });

  it('returns false for new user without profile', () => {
    expect(
      inferOnboardingComplete({
        ...baseOverview,
        profile: null,
        mailbox: { connected: false, emailAddress: null, provider: null, status: null },
      })
    ).toBe(false);
  });
});

describe('applyOverviewToSession', () => {
  beforeEach(() => {
    useSessionStore.getState().clearLocalSession();
  });

  it('hydrates profile, mailbox, consent, and marks onboarding complete', () => {
    applyOverviewToSession(baseOverview);
    const s = useSessionStore.getState();
    expect(s.profileBasics?.displayName).toBe('Mia');
    expect(s.mailboxConnection?.email).toBe('creator@example.com');
    expect(s.agentSendMode).toBe('agent_assist');
    expect(s.complianceAcceptedAt).toBeTruthy();
    expect(s.onboardingComplete).toBe(true);
    expect(s.tenantDisplayName).toBe('Personal');
  });

  it('restores skip-inbox state from overview', () => {
    applyOverviewToSession({
      ...baseOverview,
      mailbox: { connected: false, emailAddress: null, provider: null, status: null },
      inboxSetupSkipped: true,
    });
    const s = useSessionStore.getState();
    expect(s.emailSkipped).toBe(true);
    expect(s.emailWizardFinished).toBe(true);
    expect(s.onboardingComplete).toBe(true);
  });

  it('does not throw when mailbox is missing', () => {
    const overview = { ...baseOverview, mailbox: undefined as unknown as AccountOverviewResponse['mailbox'] };
    expect(() => applyOverviewToSession(overview)).not.toThrow();
    expect(useSessionStore.getState().profileBasics?.displayName).toBe('Mia');
  });

  it('skips onboarding hydration while replay is in progress', () => {
    useSessionStore.setState({
      isAuthenticated: true,
      onboardingReplayInProgress: true,
      onboardingComplete: false,
      profileBasics: null,
    });
    applyOverviewToSession(baseOverview);
    const s = useSessionStore.getState();
    expect(s.profileBasics).toBeNull();
    expect(s.onboardingComplete).toBe(false);
    expect(s.mailboxConnection).toBeNull();
    expect(s.tenantDisplayName).toBe('Personal');
  });
});

describe('replaceTenantOnboardingFromOverview', () => {
  beforeEach(() => {
    useSessionStore.getState().clearLocalSession();
    useSessionStore.setState({
      isAuthenticated: true,
      onboardingComplete: true,
      profileBasics: {
        displayName: 'Old tenant',
        niche: 'Old niche',
        platforms: ['YouTube'],
      },
      complianceAcceptedAt: '2026-06-01T00:00:00.000Z',
      emailWizardFinished: true,
    });
  });

  it('replaces prior-tenant onboarding fields in one write', () => {
    replaceTenantOnboardingFromOverview({
      ...baseOverview,
      onboardingCompletedAt: '2026-06-09T12:00:00.000Z',
    });

    const s = useSessionStore.getState();
    expect(s.profileBasics?.displayName).toBe('Mia');
    expect(s.onboardingComplete).toBe(true);
    expect(s.emailWizardFinished).toBe(true);
  });

  it('clears onboarding when the target tenant has no profile', () => {
    replaceTenantOnboardingFromOverview({
      ...baseOverview,
      profile: null,
      mailbox: { connected: false, emailAddress: null, provider: null, status: null },
      onboardingCompletedAt: null,
    });

    const s = useSessionStore.getState();
    expect(s.profileBasics).toBeNull();
    expect(s.onboardingComplete).toBe(false);
    expect(s.emailWizardFinished).toBe(false);
  });
});
