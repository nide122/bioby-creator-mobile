import { mapCreatorProfileResponse } from '@/src/api/account-api';

describe('mapCreatorProfileResponse', () => {
  it('restores platformProfiles from API payload', () => {
    const basics = mapCreatorProfileResponse({
      displayName: 'Mia Creator',
      bio: 'Creator bio',
      nicheTags: ['Home'],
      platforms: ['TikTok'],
      platform: 'tiktok',
      profileUrl: 'https://www.tiktok.com/@home.finds',
      platformProfiles: {
        youtube: { platform: 'youtube', status: 'empty' },
        tiktok: {
          platform: 'tiktok',
          status: 'linked',
          profileUrl: 'https://www.tiktok.com/@home.finds',
          handle: 'home.finds',
          followerCountLabel: '210K followers',
          followerCount: 210000,
          avgViews: 50000,
          engagementRate: 0.05,
        },
        instagram: { platform: 'instagram', status: 'empty' },
      },
    });

    expect(basics.platformProfiles?.tiktok.handle).toBe('home.finds');
    expect(basics.platformProfiles?.tiktok.followerCountLabel).toBe('210K followers');
    expect(basics.platformProfiles?.tiktok.followerCount).toBe(210000);
    expect(basics.platformProfiles?.tiktok.avgViews).toBe(50000);
    expect(basics.platformProfiles?.tiktok.engagementRate).toBe(0.05);
    expect(basics.platforms).toEqual(['TikTok']);
  });

  it('migrates legacy single-url payload when platformProfiles missing', () => {
    const basics = mapCreatorProfileResponse({
      displayName: 'Mia Creator',
      bio: 'Creator bio',
      nicheTags: ['Home'],
      platforms: ['TikTok'],
      platform: 'tiktok',
      profileUrl: 'https://www.tiktok.com/@home.finds',
    });

    expect(basics.platformProfiles?.tiktok.status).toBe('linked');
    expect(basics.platformProfiles?.tiktok.profileUrl).toBe('https://www.tiktok.com/@home.finds');
  });
});
