import {
  getStackBackFallbackHref,
  shouldPreferExplicitInboxThreadBack,
  shouldPreferExplicitOnboardingBack,
} from '../navigation-theme';

describe('shouldPreferExplicitOnboardingBack', () => {
  it('is true for linear onboarding steps except profile', () => {
    expect(shouldPreferExplicitOnboardingBack('/onboarding/consent')).toBe(true);
    expect(shouldPreferExplicitOnboardingBack('/onboarding/email')).toBe(true);
    expect(shouldPreferExplicitOnboardingBack('/onboarding/complete')).toBe(true);
  });

  it('is false for profile and dispatcher', () => {
    expect(shouldPreferExplicitOnboardingBack('/onboarding/profile')).toBe(false);
    expect(shouldPreferExplicitOnboardingBack('/onboarding')).toBe(false);
  });
});

describe('shouldPreferExplicitInboxThreadBack', () => {
  it('is true for thread detail routes', () => {
    expect(shouldPreferExplicitInboxThreadBack('/inbox/42')).toBe(true);
  });

  it('is false for inbox list', () => {
    expect(shouldPreferExplicitInboxThreadBack('/inbox')).toBe(false);
  });
});

describe('getStackBackFallbackHref', () => {
  describe('onboarding (refresh loses stack history)', () => {
    it('email step returns consent, not the dispatcher', () => {
      expect(getStackBackFallbackHref('/onboarding/email')).toBe('/onboarding/consent');
    });

    it('consent step returns profile', () => {
      expect(getStackBackFallbackHref('/onboarding/consent')).toBe('/onboarding/profile');
    });

    it('complete step returns email', () => {
      expect(getStackBackFallbackHref('/onboarding/complete')).toBe('/onboarding/email');
    });

    it('email from account tab returns account', () => {
      expect(getStackBackFallbackHref('/onboarding/email', { source: 'account' })).toBe('/account');
    });
  });

  describe('nested stacks', () => {
    it('deal sub-routes return deal detail', () => {
      expect(getStackBackFallbackHref('/deal/mock-deal-beta/packet')).toBe('/deal/mock-deal-beta');
    });

    it('settings routes return account tab', () => {
      expect(getStackBackFallbackHref('/settings/team')).toBe('/account');
    });

    it('inbox thread detail returns inbox list', () => {
      expect(getStackBackFallbackHref('/inbox/42')).toBe('/inbox');
    });
  });
});
