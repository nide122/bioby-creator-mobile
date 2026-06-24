import { getOnboardingResumeRoute, getPostAuthRoute } from '@/src/auth/post-auth-navigation';
import { isApiConfigured } from '@/src/api/api-config';
import { useSessionStore } from '@/src/stores/session-store';

jest.mock('@/src/api/api-config', () => ({
  isApiConfigured: jest.fn(),
}));

const mockedIsApiConfigured = isApiConfigured as jest.MockedFunction<typeof isApiConfigured>;

describe('getOnboardingResumeRoute', () => {
  beforeEach(() => {
    useSessionStore.getState().clearLocalSession();
  });

  it('returns profile when basics are missing', () => {
    expect(getOnboardingResumeRoute()).toBe('/onboarding/profile');
  });

  it('returns consent when profile exists but consent is missing', () => {
    useSessionStore.setState({
      profileBasics: {
        displayName: 'Mia',
        niche: 'Skincare',
        platforms: ['TikTok'],
      },
    });
    expect(getOnboardingResumeRoute()).toBe('/onboarding/consent');
  });

  it('returns email when inbox setup is pending', () => {
    useSessionStore.setState({
      profileBasics: {
        displayName: 'Mia',
        niche: 'Skincare',
        platforms: ['TikTok'],
      },
      complianceAcceptedAt: '2026-06-09T12:00:00.000Z',
      inboxFilterStepFinished: true,
      emailWizardFinished: false,
    });
    expect(getOnboardingResumeRoute()).toBe('/onboarding/email');
  });

  it('returns pricing setup when rate card step is pending', () => {
    useSessionStore.setState({
      profileBasics: {
        displayName: 'Mia',
        niche: 'Skincare',
        platforms: ['TikTok'],
      },
      complianceAcceptedAt: '2026-06-09T12:00:00.000Z',
      inboxFilterStepFinished: true,
      emailWizardFinished: true,
      rateCardStepFinished: false,
    });
    expect(getOnboardingResumeRoute()).toBe('/onboarding/pricing-setup');
  });
});

describe('getPostAuthRoute', () => {
  beforeEach(() => {
    useSessionStore.getState().clearLocalSession();
    mockedIsApiConfigured.mockReset();
  });

  it('returns onboarding in demo mode even when onboardingComplete', () => {
    mockedIsApiConfigured.mockReturnValue(false);
    useSessionStore.setState({ onboardingComplete: true, isAuthenticated: true });
    expect(getPostAuthRoute()).toBe('/onboarding');
  });

  it('returns inbox for onboarded API users', () => {
    mockedIsApiConfigured.mockReturnValue(true);
    useSessionStore.setState({ onboardingComplete: true, isAuthenticated: true });
    expect(getPostAuthRoute()).toBe('/inbox');
  });

  it('returns the pending onboarding step for new API users', () => {
    mockedIsApiConfigured.mockReturnValue(true);
    useSessionStore.setState({
      onboardingComplete: false,
      isAuthenticated: true,
      profileBasics: {
        displayName: 'Mia',
        niche: 'Skincare',
        platforms: ['TikTok'],
      },
      complianceAcceptedAt: '2026-06-09T12:00:00.000Z',
      emailWizardFinished: false,
    });
    expect(getPostAuthRoute()).toBe('/onboarding/email');
  });
});
