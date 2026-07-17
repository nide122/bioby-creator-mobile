import {
  getStackBackFallbackHref,
  shouldPreferExplicitBrandBack,
  shouldPreferExplicitInboxThreadBack,
  shouldPreferExplicitInboxThreadMessagesBack,
  shouldPreferExplicitOnboardingBack,
} from '../navigation-theme';
import { resolveReturnTarget } from '../open-brand-detail';

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

describe('shouldPreferExplicitInboxThreadMessagesBack', () => {
  it('is true for a thread original-message list', () => {
    expect(shouldPreferExplicitInboxThreadMessagesBack('/inbox/42/messages')).toBe(true);
  });

  it('is false for a single message and thread detail', () => {
    expect(shouldPreferExplicitInboxThreadMessagesBack('/inbox/message/81')).toBe(false);
    expect(shouldPreferExplicitInboxThreadMessagesBack('/inbox/42')).toBe(false);
  });
});

describe('shouldPreferExplicitBrandBack', () => {
  it('is true when brand detail has returnTo', () => {
    expect(shouldPreferExplicitBrandBack('/brand/5', { returnTo: '/inbox' })).toBe(true);
  });

  it('is false without returnTo', () => {
    expect(shouldPreferExplicitBrandBack('/brand/5')).toBe(false);
  });
});

describe('resolveReturnTarget', () => {
  it('re-attaches parent returnTo when navigating back to brand', () => {
    expect(resolveReturnTarget('/brand/5', '/inbox')).toEqual({
      pathname: '/brand/[brandId]',
      params: { brandId: '5', returnTo: '/inbox' },
    });
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

    it('inbox thread detail returns returnTo when provided', () => {
      expect(getStackBackFallbackHref('/inbox/42', { returnTo: '/brand/5' })).toBe('/brand/5');
    });

    it('inbox thread detail returns today when returnTo is /', () => {
      expect(getStackBackFallbackHref('/inbox/42', { returnTo: '/' })).toBe('/');
    });

    it('inbox thread detail restores brand context with parentReturnTo', () => {
      expect(getStackBackFallbackHref('/inbox/42', { returnTo: '/brand/5', parentReturnTo: '/inbox' })).toEqual({
        pathname: '/brand/[brandId]',
        params: { brandId: '5', returnTo: '/inbox' },
      });
    });

    it('inbox thread message list returns to its thread detail', () => {
      expect(getStackBackFallbackHref('/inbox/42/messages')).toBe('/inbox/42');
    });

    it('inbox thread message list preserves upstream return context', () => {
      expect(
        getStackBackFallbackHref('/inbox/42/messages', {
          returnTo: '/brand/5',
          parentReturnTo: '/inbox',
        }),
      ).toEqual({
        pathname: '/inbox/[threadId]',
        params: { threadId: '42', returnTo: '/brand/5', parentReturnTo: '/inbox' },
      });
    });

    it('inbox message detail returns returnTo when directReturn is set', () => {
      expect(
        getStackBackFallbackHref('/inbox/message/81', {
          threadId: '53',
          returnTo: '/brand/5',
          parentReturnTo: '/inbox',
          directReturn: '1',
        }),
      ).toEqual({
        pathname: '/brand/[brandId]',
        params: { brandId: '5', returnTo: '/inbox' },
      });
    });

    it('inbox message detail returns parent thread when opened from thread detail', () => {
      expect(
        getStackBackFallbackHref('/inbox/message/81', {
          threadId: '53',
          returnTo: '/brand/5',
          parentReturnTo: '/inbox',
        }),
      ).toEqual({
        pathname: '/inbox/[threadId]',
        params: { threadId: '53', returnTo: '/brand/5', parentReturnTo: '/inbox' },
      });
    });

    it('inbox message detail returns to the original-message list when opened there', () => {
      expect(
        getStackBackFallbackHref('/inbox/message/81', {
          threadId: '53',
          returnToMessages: '1',
        }),
      ).toBe('/inbox/53/messages');
    });

    it('inbox message list return preserves upstream context', () => {
      expect(
        getStackBackFallbackHref('/inbox/message/81', {
          threadId: '53',
          returnTo: '/brand/5',
          parentReturnTo: '/inbox',
          returnToMessages: '1',
        }),
      ).toEqual({
        pathname: '/inbox/[threadId]/messages',
        params: { threadId: '53', returnTo: '/brand/5', parentReturnTo: '/inbox' },
      });
    });

    it('inbox message detail returns returnTo when provided without thread context', () => {
      expect(getStackBackFallbackHref('/inbox/message/81', { returnTo: '/brand/5' })).toBe('/brand/5');
    });

    it('inbox message detail returns parent thread when threadId is present without returnTo', () => {
      expect(getStackBackFallbackHref('/inbox/message/81', { threadId: '53' })).toBe('/inbox/53');
    });

    it('inbox message detail falls back to inbox list without threadId', () => {
      expect(getStackBackFallbackHref('/inbox/message/81')).toBe('/inbox');
    });

    it('brand detail returns upstream returnTo', () => {
      expect(getStackBackFallbackHref('/brand/5', { returnTo: '/inbox' })).toBe('/inbox');
    });
  });
});
