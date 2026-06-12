import { getRouteGuardRedirect, hasWebOAuthCallbackInUrl } from '@/src/lib/route-guard';

describe('getRouteGuardRedirect', () => {
  describe('unauthenticated', () => {
    it('allows auth screens', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/welcome',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect({
          pathname: '/register',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
    });

    it('allows oauth callback routes while unauthenticated', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/oauth/callback',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect({
          pathname: '/',
          isAuthenticated: false,
          onboardingComplete: false,
          webOAuthCallbackInProgress: true,
        })
      ).toBeNull();
    });

    it('redirects protected routes to welcome', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/inbox',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBe('/welcome');
      expect(
        getRouteGuardRedirect({
          pathname: '/',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBe('/welcome');
      expect(
        getRouteGuardRedirect({
          pathname: '/deal/mock-deal-beta',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBe('/welcome');
    });

    it('allows public media kit links without auth', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/c/mia-skin-notes',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
    });
  });

  describe('authenticated, onboarding incomplete', () => {
    it('allows onboarding stack', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/onboarding/profile',
          isAuthenticated: true,
          onboardingComplete: false,
        })
      ).toBeNull();
    });

    it('redirects workspace routes to onboarding dispatcher', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/inbox',
          isAuthenticated: true,
          onboardingComplete: false,
        })
      ).toBe('/onboarding');
      expect(
        getRouteGuardRedirect({
          pathname: '/',
          isAuthenticated: true,
          onboardingComplete: false,
        })
      ).toBe('/onboarding');
    });

    it('does not trap user on welcome when onboarding incomplete', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/welcome',
          isAuthenticated: true,
          onboardingComplete: false,
        })
      ).toBe('/onboarding');
    });

  });

  describe('authenticated, onboarding complete', () => {
    it('allows main app routes including Today tab root', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect({
          pathname: '/inbox',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect({
          pathname: '/onboarding/email',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBeNull();
    });

    it('allows welcome for signed-in users to switch account', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/welcome',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBeNull();
    });

    it('redirects login and register to inbox', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/login',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBe('/inbox');
      expect(
        getRouteGuardRedirect({
          pathname: '/register',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBe('/inbox');
    });
  });
});

describe('hasWebOAuthCallbackInUrl', () => {
  it('detects implicit and code OAuth callbacks', () => {
    expect(hasWebOAuthCallbackInUrl('', '#access_token=abc&state=xyz')).toBe(true);
    expect(hasWebOAuthCallbackInUrl('?code=abc&state=xyz', '')).toBe(true);
    expect(hasWebOAuthCallbackInUrl('', '#id_token=abc')).toBe(true);
    expect(hasWebOAuthCallbackInUrl('', '')).toBe(false);
  });
});
