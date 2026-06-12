/** Where NavigationBootstrap should redirect, or null to stay on current route. */
export type RouteGuardRedirect = '/welcome' | '/onboarding' | '/inbox' | null;

export type RouteGuardInput = {
  pathname: string;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  /** True when the browser URL still carries OAuth callback params (web popup). */
  webOAuthCallbackInProgress?: boolean;
};

function isWelcomePath(pathname: string): boolean {
  return pathname === '/welcome';
}

function isAuthFormPath(pathname: string): boolean {
  return pathname.startsWith('/register') || pathname.startsWith('/login');
}

function isAuthPath(pathname: string): boolean {
  return isWelcomePath(pathname) || isAuthFormPath(pathname);
}

function isOnboardingPath(pathname: string): boolean {
  return pathname.startsWith('/onboarding');
}

function isOAuthCallbackPath(pathname: string): boolean {
  return pathname.startsWith('/oauth');
}

function isPublicMediaKitPath(pathname: string): boolean {
  return pathname.startsWith('/c/');
}

/** Web OAuth popup lands with tokens/code in the URL before the opener receives the result. */
export function hasWebOAuthCallbackInUrl(urlSearch = '', urlHash = ''): boolean {
  const blob = `${urlSearch}${urlHash}`;
  return /(?:^|[?#&])(code|access_token|id_token)=/.test(blob);
}

/**
 * Pure route-guard decision used by NavigationBootstrap (unit-testable without expo-router).
 */
export function getRouteGuardRedirect({
  pathname,
  isAuthenticated,
  onboardingComplete,
  webOAuthCallbackInProgress = false,
}: RouteGuardInput): RouteGuardRedirect {
  if (!pathname) return null;

  if (isPublicMediaKitPath(pathname)) {
    return null;
  }

  const inAuthFlow = isAuthPath(pathname);
  const inOnboardingFlow = isOnboardingPath(pathname);

  if (!isAuthenticated) {
    if (inAuthFlow || isOAuthCallbackPath(pathname) || webOAuthCallbackInProgress) {
      return null;
    }
    return '/welcome';
  }

  if (!onboardingComplete) {
    return inOnboardingFlow ? null : '/onboarding';
  }

  if (isAuthFormPath(pathname)) {
    return '/inbox';
  }

  return null;
}
