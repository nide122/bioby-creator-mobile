import { resolvePublicDemoEnabled } from '@/src/demo/public-demo-config';

describe('public demo feature gate', () => {
  it('is always available in development', () => {
    expect(resolvePublicDemoEnabled({ dev: true })).toBe(true);
  });

  it('requires both the explicit flag and approved Vercel host in production', () => {
    expect(
      resolvePublicDemoEnabled({
        dev: false,
        enabledFlag: 'true',
        hostname: 'bioby-creator-mobile.vercel.app',
      }),
    ).toBe(true);
    expect(
      resolvePublicDemoEnabled({ dev: false, enabledFlag: 'false', hostname: 'bioby-creator-mobile.vercel.app' }),
    ).toBe(false);
    expect(
      resolvePublicDemoEnabled({ dev: false, enabledFlag: 'true', hostname: 'creator.bioby.ai' }),
    ).toBe(false);
  });

  it('renders the enabled CTA during static export before a browser hostname exists', () => {
    expect(resolvePublicDemoEnabled({ dev: false, enabledFlag: 'true' })).toBe(true);
  });

  it('defaults on for the approved host when deployment env settings are unavailable', () => {
    expect(
      resolvePublicDemoEnabled({
        dev: false,
        hostname: 'bioby-creator-mobile.vercel.app',
      }),
    ).toBe(true);
    expect(
      resolvePublicDemoEnabled({
        dev: false,
        hostname: 'creator.bioby.ai',
      }),
    ).toBe(false);
  });

  it('can be disabled later with the code-level default switch', () => {
    expect(
      resolvePublicDemoEnabled({
        dev: false,
        hostname: 'bioby-creator-mobile.vercel.app',
        defaultEnabled: false,
      }),
    ).toBe(false);
  });
});
