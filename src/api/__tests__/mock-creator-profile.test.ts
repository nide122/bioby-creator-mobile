import { resolveCreatorProfileFromUrl } from '@/src/api/mock-creator-profile';

jest.mock('@/src/lib/mock-delay', () => ({
  mockDelay: jest.fn().mockResolvedValue(undefined),
}));

describe('resolveCreatorProfileFromUrl', () => {
  it('resolves a supported TikTok profile URL', async () => {
    const profile = await resolveCreatorProfileFromUrl('https://www.tiktok.com/@e2e.creator');

    expect(profile.platform).toBe('tiktok');
    expect(profile.platformLabel).toBe('TikTok');
    expect(profile.handle).toBe('e2e.creator');
    expect(profile.displayName).toBeTruthy();
    expect(profile.nicheTags.length).toBeGreaterThan(0);
  });

  it('rejects unknown hosts', async () => {
    await expect(resolveCreatorProfileFromUrl('https://example.com/user')).rejects.toThrow(
      /do not recognize/i
    );
  });

  it('rejects malformed URLs', async () => {
    await expect(resolveCreatorProfileFromUrl('not a url')).rejects.toThrow(/valid/i);
  });
});
