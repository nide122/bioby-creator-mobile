const PUBLIC_DEMO_HOST = 'bioby-creator-mobile.vercel.app';
/** Code-level switch for deployments where Vercel environment settings are unavailable. */
export const PUBLIC_DEMO_DEFAULT_ENABLED = true;

export type PublicDemoEnvironment = {
  dev: boolean;
  enabledFlag?: string;
  hostname?: string;
  defaultEnabled?: boolean;
};

/** Pure resolver kept separate so production/host safeguards are unit-testable. */
export function resolvePublicDemoEnabled({
  dev,
  enabledFlag,
  hostname,
  defaultEnabled = PUBLIC_DEMO_DEFAULT_ENABLED,
}: PublicDemoEnvironment): boolean {
  if (dev) return true;
  const normalizedFlag = enabledFlag?.trim().toLowerCase();
  const enabled = normalizedFlag ? normalizedFlag === 'true' : defaultEnabled;
  if (!enabled) return false;
  // Static export has no browser hostname. The client repeats the check before entering the sandbox.
  return hostname == null || hostname === PUBLIC_DEMO_HOST;
}

/** Public, browser-only product sandbox. Production requires both the flag and the approved host. */
export function isPublicDemoEnabled(): boolean {
  return resolvePublicDemoEnabled({
    dev: __DEV__,
    enabledFlag: process.env.EXPO_PUBLIC_PUBLIC_DEMO_ENABLED,
    hostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
  });
}
