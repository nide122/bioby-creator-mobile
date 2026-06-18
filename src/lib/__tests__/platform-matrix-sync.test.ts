import {
  applyProfilePrefillToMediaKitRow,
  createMediaKitRowFromProfileSlot,
  filterVisibleMediaKitPlatforms,
  findProfilePlatformMissingFromMatrix,
  formatAvgViewsLabel,
  formatEngagementRateLabel,
  mergeProfileChannelsWithMatrix,
  platformSlotToMediaKitRow,
  resolvePresetPlatformKeyFromName,
} from '@/src/lib/platform-matrix-sync';
import { createEmptyPlatformProfiles, platformSlotFromResolved } from '@/src/lib/creator-profile-aggregate';

describe('platform-matrix-sync', () => {
  it('maps a linked slot to a media kit row', () => {
    const profiles = createEmptyPlatformProfiles();
    profiles.tiktok = platformSlotFromResolved('tiktok', {
      platform: 'tiktok',
      platformLabel: 'TikTok',
      rawInputUrl: 'https://tiktok.com/@home.finds',
      canonicalUrl: 'https://tiktok.com/@home.finds',
      handle: 'home.finds',
      displayName: 'Home Finds',
      bio: 'Short-form home gadgets',
      followerCountLabel: '210K followers',
      nicheTags: ['Home'],
      confidence: 'high',
      fetchedAtISO: '2026-06-12T00:00:00.000Z',
      avgViews: 185_000,
    });

    expect(platformSlotToMediaKitRow(profiles.tiktok)).toEqual({
      name: 'TikTok',
      handle: 'home.finds',
      followersRange: '210K followers',
      nicheNote: 'Short-form home gadgets',
      monthlyViews: '~185K views / mo',
      profileSource: 'tiktok',
      visibleInPreview: true,
    });
  });

  it('prefills empty matrix fields from profile without overwriting edits', () => {
    const profiles = createEmptyPlatformProfiles();
    profiles.youtube = {
      platform: 'youtube',
      status: 'linked',
      handle: 'calmstudio',
      followerCountLabel: '58K subscribers',
      bio: 'Travel creator',
    };

    expect(
      applyProfilePrefillToMediaKitRow(
        { name: 'YouTube', followersRange: '', nicheNote: '', handle: '' },
        profiles,
      ),
    ).toEqual({
      name: 'YouTube',
      handle: 'calmstudio',
      followersRange: '58K subscribers',
      nicheNote: 'Travel creator',
      monthlyViews: undefined,
      visibleInPreview: true,
    });

    expect(
      applyProfilePrefillToMediaKitRow(
        {
          name: 'YouTube',
          followersRange: 'Custom range',
          nicheNote: 'Brand-facing note',
          handle: '@custom',
        },
        profiles,
      ),
    ).toEqual({
      name: 'YouTube',
      handle: '@custom',
      followersRange: 'Custom range',
      nicheNote: 'Brand-facing note',
      monthlyViews: undefined,
      visibleInPreview: true,
    });
  });

  it('resolves preset platform names for prefill', () => {
    expect(resolvePresetPlatformKeyFromName('tiktok')).toBe('tiktok');
    expect(resolvePresetPlatformKeyFromName('TikTok')).toBe('tiktok');
  });

  it('finds linked profile platforms missing from the matrix', () => {
    const profiles = createEmptyPlatformProfiles();
    profiles.youtube = { platform: 'youtube', status: 'linked', handle: 'a' };
    profiles.tiktok = { platform: 'tiktok', status: 'linked', handle: 'b' };

    expect(findProfilePlatformMissingFromMatrix(profiles, [{ name: 'YouTube', followersRange: '', nicheNote: '' }])).toBe(
      'tiktok',
    );
    expect(createMediaKitRowFromProfileSlot('tiktok', profiles).handle).toBe('b');
  });

  it('mergeProfileChannelsWithMatrix inserts profile rows and keeps manual rows', () => {
    const profiles = createEmptyPlatformProfiles();
    profiles.tiktok = {
      platform: 'tiktok',
      status: 'linked',
      handle: 'home.finds',
      followerCountLabel: '210K followers',
    };
    profiles.instagram = { platform: 'instagram', status: 'linked', handle: 'creator' };

    const merged = mergeProfileChannelsWithMatrix(
      [
        { name: 'TikTok', followersRange: 'old', nicheNote: 'Brand note', visibleInPreview: false },
        { name: 'Bilibili', followersRange: '100k', nicheNote: 'CN audience' },
      ],
      profiles,
    );

    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({
      name: 'TikTok',
      handle: 'home.finds',
      followersRange: '210K followers',
      nicheNote: 'Brand note',
      visibleInPreview: false,
      profileSource: 'tiktok',
    });
    expect(merged[1]).toMatchObject({
      name: 'Instagram',
      profileSource: 'instagram',
      visibleInPreview: true,
    });
    expect(merged[2]).toMatchObject({ name: 'Bilibili', followersRange: '100k' });
  });

  it('filterVisibleMediaKitPlatforms omits hidden rows', () => {
    const visible = filterVisibleMediaKitPlatforms([
      { name: 'TikTok', followersRange: '1M', nicheNote: '', visibleInPreview: true },
      { name: 'Instagram', followersRange: '500k', nicheNote: '', visibleInPreview: false },
    ]);

    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe('TikTok');
  });

  it('formatAvgViewsLabel and formatEngagementRateLabel format CRM metrics', () => {
    expect(formatAvgViewsLabel(50_000)).toBe('~50K views / mo');
    expect(formatEngagementRateLabel(0.052)).toBe('5.2% engagement');
  });
});
