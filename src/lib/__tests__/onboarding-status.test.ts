import {
  buildOnboardingDashboardStatus,
  isEmailStepComplete,
  isProfileStepComplete,
  onboardingDashboardRouteForStep,
} from '@/src/lib/onboarding-status';

describe('onboarding-status', () => {
  it('marks profile complete when a platform is linked or summary rules pass', () => {
    expect(
      isProfileStepComplete({
        displayName: 'Alex',
        bio: 'A long enough bio',
        platformProfiles: {
          youtube: { platform: 'youtube', status: 'empty' },
          tiktok: { platform: 'tiktok', status: 'empty' },
          instagram: { platform: 'instagram', status: 'empty' },
        },
      }),
    ).toBe(true);

    expect(
      isProfileStepComplete({
        displayName: 'Alex',
        platformProfiles: {
          youtube: {
            platform: 'youtube',
            status: 'linked',
            profileUrl: 'https://www.youtube.com/@alex',
          },
          tiktok: { platform: 'tiktok', status: 'empty' },
          instagram: { platform: 'instagram', status: 'empty' },
        },
      }),
    ).toBe(true);

    expect(isProfileStepComplete({ displayName: 'A', bio: 'short' })).toBe(false);
  });

  it('marks email complete only when mailbox is connected', () => {
    expect(isEmailStepComplete({ mailboxConnected: true })).toBe(true);
    expect(isEmailStepComplete({ mailboxConnected: false })).toBe(false);
  });

  it('builds dashboard status and routes incomplete steps', () => {
    const status = buildOnboardingDashboardStatus({
      profile: { displayName: 'Alex', bio: 'Long enough bio' },
      mailboxConnected: false,
      creatorVerificationStatus: 'unverified',
    });

    expect(status.allComplete).toBe(false);
    expect(status.steps.find((step) => step.key === 'profile')?.completed).toBe(true);
    expect(onboardingDashboardRouteForStep('email')).toBe('/onboarding/email?source=account');
    expect(onboardingDashboardRouteForStep('verification')).toBe('/(tabs)/inbox');
  });
});
