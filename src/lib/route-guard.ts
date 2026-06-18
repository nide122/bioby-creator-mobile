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
  return (
    pathname.startsWith('/register') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email-pending')
  );
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

function isTeamInviteAcceptPath(pathname: string): boolean {
  return pathname.startsWith('/team/accept');
}

function isPasswordResetPath(pathname: string): boolean {
  return pathname.startsWith('/reset-password');
}

function isEmailVerificationPendingPath(pathname: string): boolean {
  return pathname.startsWith('/verify-email-pending');
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
    if (inAuthFlow || isOAuthCallbackPath(pathname) || isTeamInviteAcceptPath(pathname) || webOAuthCallbackInProgress) {
      return null;
    }
    return '/welcome';
  }

  if (!onboardingComplete) {
    if (isTeamInviteAcceptPath(pathname) || isPasswordResetPath(pathname) || isEmailVerificationPendingPath(pathname)) {
      return null;
    }
    return inOnboardingFlow ? null : '/onboarding';
  }

  if (isAuthFormPath(pathname) && !isPasswordResetPath(pathname) && !isEmailVerificationPendingPath(pathname)) {
    return '/inbox';
  }

  return null;
}
