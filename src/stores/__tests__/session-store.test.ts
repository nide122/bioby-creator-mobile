import { useSessionStore } from '@/src/stores/session-store';

describe('session-store', () => {
  beforeEach(() => {
    useSessionStore.getState().resetDemoSession();
  });

  it('starts logged out', () => {
    const s = useSessionStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.onboardingComplete).toBe(false);
  });

  it('signInDemo authenticates without completing onboarding', () => {
    useSessionStore.getState().signInDemo('creator@example.com', { displayNameHint: 'Mia' });
    const s = useSessionStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.accountEmail).toBe('creator@example.com');
    expect(s.pendingDisplayName).toBe('Mia');
    expect(s.onboardingComplete).toBe(false);
  });

  it('jumpToWorkspaceDemo opens a fully onboarded demo workspace', () => {
    useSessionStore.getState().jumpToWorkspaceDemo();
    const s = useSessionStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.isLocalDemoWorkspace).toBe(true);
    expect(s.tenantPublicId).toBeNull();
    expect(s.onboardingComplete).toBe(true);
    expect(s.profileBasics?.displayName).toBeTruthy();
    expect(s.mailboxConnection?.email).toBeTruthy();
  });

  it('finalizeOnboarding requires profile, compliance, email, and rate card steps', () => {
    useSessionStore.getState().signInDemo('creator@example.com');
    useSessionStore.getState().finalizeOnboarding();
    expect(useSessionStore.getState().onboardingComplete).toBe(false);

    useSessionStore.getState().setProfileBasics({
      displayName: 'Mia',
      niche: 'Skincare',
      platforms: ['TikTok'],
    });
    useSessionStore.getState().acceptCompliance('agent_assist');
    useSessionStore.getState().completeEmailWizard('inbox@example.com');
    useSessionStore.getState().finalizeOnboarding();
    expect(useSessionStore.getState().onboardingComplete).toBe(false);

    useSessionStore.getState().completeRateCardStep();
    useSessionStore.getState().finalizeOnboarding();

    expect(useSessionStore.getState().onboardingComplete).toBe(true);
  });

  it('signOutDemo clears session', () => {
    useSessionStore.getState().jumpToWorkspaceDemo();
    useSessionStore.getState().signOutDemo();
    const s = useSessionStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.onboardingComplete).toBe(false);
    expect(s.profileBasics).toBeNull();
  });
});
