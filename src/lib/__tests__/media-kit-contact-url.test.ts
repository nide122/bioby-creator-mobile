import {
  buildMediaKitContactUrl,
  isContactUrlCopyable,
  parseContactSlug,
  resolveMediaKitContactUrl,
  slugifyDisplayName,
} from '@/src/lib/media-kit-contact-url';

describe('media-kit-contact-url', () => {
  const originalPublicWebBaseUrl = process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL = 'https://example.test';
  });

  afterEach(() => {
    if (originalPublicWebBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL = originalPublicWebBaseUrl;
    }
  });

  it('builds contactUrl from slug', () => {
    expect(buildMediaKitContactUrl('mia-skin-notes')).toBe('https://example.test/c/mia-skin-notes');
  });

  it('parses slug from contactUrl', () => {
    expect(parseContactSlug('https://example.test/c/mia-skin-notes')).toBe('mia-skin-notes');
    expect(parseContactSlug(undefined)).toBeNull();
  });

  it('rejects generic creator slugs for copy', () => {
    expect(isContactUrlCopyable('https://example.test/c/creator')).toBe(false);
    expect(isContactUrlCopyable('https://example.test/c/mia-skin-notes')).toBe(true);
  });

  it('rewrites stale bioby.app links to the configured public web origin', () => {
    expect(resolveMediaKitContactUrl('https://bioby.app/c/mia-skin-notes')).toBe(
      'https://example.test/c/mia-skin-notes'
    );
  });

  it('slugifies display names consistently', () => {
    expect(slugifyDisplayName('Mia Skin Notes')).toBe('mia-skin-notes');
  });
});
