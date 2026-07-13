import { getRouteGuardRedirect, hasWebOAuthCallbackInUrl } from '@/src/lib/route-guard';

describe('getRouteGuardRedirect', () => {
  describe('unauthenticated', () => {
    it('allows auth screens and public intro/home', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/intro',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect({
          pathname: '/home',
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

    it('redirects legacy /welcome to /intro', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/welcome',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBe('/intro');
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

    it('allows forgot, reset password, and verify email pending routes while unauthenticated', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/forgot-password',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect({
          pathname: '/reset-password',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect({
          pathname: '/verify-email-pending',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
    });

    it('redirects protected routes to intro', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/inbox',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBe('/intro');
      expect(
        getRouteGuardRedirect({
          pathname: '/',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBe('/intro');
      expect(
        getRouteGuardRedirect({
          pathname: '/deal/mock-deal-beta',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBe('/intro');
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

    it('allows public proposal links without auth', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/p/share-token',
          isAuthenticated: false,
          onboardingComplete: false,
        })
      ).toBeNull();
    });

    it('allows public legal pages without auth', () => {
      for (const pathname of ['/intro', '/home', '/privacy', '/terms']) {
        expect(
          getRouteGuardRedirect({
            pathname,
            isAuthenticated: false,
            onboardingComplete: false,
          })
        ).toBeNull();
      }
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

    it('redirects legacy welcome and public intro/home to onboarding when setup incomplete', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/welcome',
          isAuthenticated: true,
          onboardingComplete: false,
        })
      ).toBe('/intro');
      expect(
        getRouteGuardRedirect({
          pathname: '/intro',
          isAuthenticated: true,
          onboardingComplete: false,
        })
      ).toBe('/onboarding');
      expect(
        getRouteGuardRedirect({
          pathname: '/home',
          isAuthenticated: true,
          onboardingComplete: false,
        })
      ).toBe('/onboarding');
    });

    it('still allows privacy and terms during onboarding', () => {
      for (const pathname of ['/privacy', '/terms']) {
        expect(
          getRouteGuardRedirect({
            pathname,
            isAuthenticated: true,
            onboardingComplete: false,
          })
        ).toBeNull();
      }
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

    it('allows home for signed-in users to switch account', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/home',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBeNull();
    });

    it('redirects legacy /welcome to /intro', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/welcome',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBe('/intro');
    });

    it('allows public legal pages when authenticated', () => {
      for (const pathname of ['/intro', '/home', '/privacy', '/terms']) {
        expect(
          getRouteGuardRedirect({
            pathname,
            isAuthenticated: true,
            onboardingComplete: true,
          })
        ).toBeNull();
      }
    });

    it('redirects login and register to Today', () => {
      expect(
        getRouteGuardRedirect({
          pathname: '/login',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBe('/');
      expect(
        getRouteGuardRedirect({
          pathname: '/register',
          isAuthenticated: true,
          onboardingComplete: true,
        })
      ).toBe('/');
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
