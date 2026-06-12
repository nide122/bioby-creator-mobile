import { platformFromServiceLabel, resolvePlatformIconKey } from '@/src/lib/platform-icon-key';

describe('resolvePlatformIconKey', () => {
  it('recognizes common platform labels and aliases', () => {
    expect(resolvePlatformIconKey('YouTube')).toBe('youtube');
    expect(resolvePlatformIconKey('instagram')).toBe('instagram');
    expect(resolvePlatformIconKey('TikTok')).toBe('tiktok');
    expect(resolvePlatformIconKey('小红书')).toBe('xiaohongshu');
    expect(resolvePlatformIconKey('RedNote')).toBe('xiaohongshu');
    expect(resolvePlatformIconKey('Bilibili')).toBe('bilibili');
    expect(resolvePlatformIconKey('Douyin')).toBe('douyin');
    expect(resolvePlatformIconKey('X')).toBe('twitter');
  });

  it('returns null for unknown or blank platforms', () => {
    expect(resolvePlatformIconKey('')).toBeNull();
    expect(resolvePlatformIconKey('   ')).toBeNull();
    expect(resolvePlatformIconKey('My Newsletter')).toBeNull();
  });
});

describe('platformFromServiceLabel', () => {
  it('extracts the platform prefix from service labels', () => {
    expect(platformFromServiceLabel('YouTube · Long video')).toBe('YouTube');
    expect(platformFromServiceLabel('Custom service')).toBe('Custom service');
  });
});
