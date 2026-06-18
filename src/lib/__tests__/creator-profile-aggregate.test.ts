import {
  buildCreatorProfileBasics,
  createEmptyPlatformProfiles,
  formatNicheTagsText,
  formatPlatformStatLine,
  isSummaryEmpty,
  mergeSummarySuggestion,
  parseNicheTags,
  platformSlotFromResolved,
  prefillSummaryIfEmpty,
  resolveAccountProfileHeroMeta,
  syncPlatformsList,
  validatePlatformUrl,
} from '@/src/lib/creator-profile-aggregate';
import type { SummarySuggestion } from '@/src/types/creator-profile';
import { PRESET_PLATFORM_LABELS } from '@/src/types/creator-profile';

describe('creator-profile-aggregate', () => {
  it('syncPlatformsList returns linked platforms in preset order', () => {
    const profiles = createEmptyPlatformProfiles();
    profiles.instagram = { platform: 'instagram', status: 'linked', profileUrl: 'https://instagram.com/a' };
    profiles.youtube = { platform: 'youtube', status: 'linked', profileUrl: 'https://youtube.com/a' };

    expect(syncPlatformsList(profiles)).toEqual(['YouTube', 'Instagram']);
  });

  it('formatNicheTagsText round-trips with parseNicheTags', () => {
    const tags = ['Skincare', 'Sensitive skin', 'Ingredients'];
    expect(parseNicheTags(formatNicheTagsText(tags))).toEqual(tags);
  });

  it('prefillSummaryIfEmpty only fills blank summary fields', () => {
    const summary = prefillSummaryIfEmpty(
      { displayName: 'Custom Name', bio: '', nicheTagsText: '' },
      {
        platform: 'youtube',
        platformLabel: 'YouTube',
        rawInputUrl: 'https://youtube.com/@a',
        canonicalUrl: 'https://youtube.com/@a',
        handle: 'a',
        displayName: 'Calm Studio',
        bio: 'Long-form creator',
        followerCountLabel: '58K subscribers',
        nicheTags: ['Travel'],
        confidence: 'high',
        fetchedAtISO: '2026-06-12T00:00:00.000Z',
      },
    );

    expect(summary.displayName).toBe('Custom Name');
    expect(summary.bio).toBe('Long-form creator');
    expect(parseNicheTags(summary.nicheTagsText)).toEqual(['Travel']);
  });

  it('mergeSummarySuggestion fills empty fields without replaceExisting', () => {
    const suggestion: SummarySuggestion = {
      suggestion: {
        displayName: 'Home Finds',
        bio: 'Brand-facing bio',
        nicheTags: ['Home', 'Gadgets'],
      },
      confidence: 'high',
      reasons: ['Combined facts from tiktok'],
    };

    const merged = mergeSummarySuggestion(
      { displayName: '', bio: '', nicheTagsText: '' },
      suggestion,
      { fields: ['displayName', 'bio', 'nicheTags'], replaceExisting: false },
    );

    expect(merged.displayName).toBe('Home Finds');
    expect(merged.bio).toBe('Brand-facing bio');
    expect(parseNicheTags(merged.nicheTagsText)).toEqual(['Home', 'Gadgets']);
  });

  it('mergeSummarySuggestion skips filled fields unless replaceExisting', () => {
    const suggestion: SummarySuggestion = {
      suggestion: {
        displayName: 'New Name',
        bio: 'New bio',
        nicheTags: ['New'],
      },
      confidence: 'high',
      reasons: [],
    };

    const merged = mergeSummarySuggestion(
      { displayName: 'Keep Name', bio: 'Keep bio', nicheTagsText: 'Old' },
      suggestion,
      { fields: ['displayName', 'bio', 'nicheTags'], replaceExisting: false },
    );

    expect(merged.displayName).toBe('Keep Name');
    expect(merged.bio).toBe('Keep bio');
    expect(parseNicheTags(merged.nicheTagsText)).toEqual(['Old']);
  });

  it('mergeSummarySuggestion replaces filled fields when replaceExisting is true', () => {
    const suggestion: SummarySuggestion = {
      suggestion: {
        displayName: 'New Name',
        bio: 'New bio from AI',
        nicheTags: ['Home', 'Gadgets'],
      },
      confidence: 'high',
      reasons: [],
    };

    const merged = mergeSummarySuggestion(
      { displayName: 'CRM Name', bio: 'CRM bio', nicheTagsText: 'Old' },
      suggestion,
      { fields: ['displayName', 'bio', 'nicheTags'], replaceExisting: true },
    );

    expect(merged.displayName).toBe('New Name');
    expect(merged.bio).toBe('New bio from AI');
    expect(parseNicheTags(merged.nicheTagsText)).toEqual(['Home', 'Gadgets']);
  });

  it('mergeSummarySuggestion replaces only nicheTags without touching other fields', () => {
    const suggestion: SummarySuggestion = {
      suggestion: {
        displayName: 'AI Name',
        bio: 'AI bio',
        nicheTags: ['Travel', 'Photo', 'Gear'],
      },
      confidence: 'high',
      reasons: [],
    };

    const merged = mergeSummarySuggestion(
      { displayName: 'Keep Name', bio: 'Keep bio', nicheTagsText: 'Old, Legacy' },
      suggestion,
      { fields: ['nicheTags'], replaceExisting: true },
    );

    expect(merged.displayName).toBe('Keep Name');
    expect(merged.bio).toBe('Keep bio');
    expect(parseNicheTags(merged.nicheTagsText)).toEqual(['Travel', 'Photo', 'Gear']);
  });

  it('mergeSummarySuggestion clears nicheTags when replaceExisting and suggestion tags are empty', () => {
    const suggestion: SummarySuggestion = {
      suggestion: {
        displayName: 'Name',
        bio: 'Bio',
        nicheTags: [],
      },
      confidence: 'high',
      reasons: [],
    };

    const merged = mergeSummarySuggestion(
      { displayName: 'Name', bio: 'Bio', nicheTagsText: 'Old, Legacy' },
      suggestion,
      { fields: ['nicheTags'], replaceExisting: true },
    );

    expect(parseNicheTags(merged.nicheTagsText)).toEqual([]);
  });

  it('isSummaryEmpty detects blank aggregate fields', () => {
    expect(isSummaryEmpty({ displayName: '', bio: '', nicheTagsText: '' })).toBe(true);
    expect(isSummaryEmpty({ displayName: 'Mia', bio: '', nicheTagsText: '' })).toBe(false);
  });

  it('validatePlatformUrl accepts host for the selected platform', () => {
    expect(validatePlatformUrl('https://www.youtube.com/@creator', 'youtube')).toBe(true);
    expect(validatePlatformUrl('https://www.tiktok.com/@creator', 'youtube')).toBe(false);
  });

  it('formatPlatformStatLine includes handle and follower count', () => {
    const profiles = createEmptyPlatformProfiles();
    profiles.tiktok = {
      platform: 'tiktok',
      status: 'linked',
      handle: 'home.finds',
      followerCountLabel: '210K followers',
    };

    expect(formatPlatformStatLine(profiles.tiktok)).toBe('TikTok · @home.finds · 210K followers');
  });

  it('buildCreatorProfileBasics keeps platformProfiles and legacy fields', () => {
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
    });

    const basics = buildCreatorProfileBasics({
      summary: { displayName: 'Creator', bio: 'Bio', nicheTagsText: 'Home' },
      platformProfiles: profiles,
    });

    expect(basics.platforms).toEqual(['TikTok']);
    expect(basics.platformProfiles?.tiktok.handle).toBe('home.finds');
    expect(basics.platform).toBe('tiktok');
    expect(basics.platformLabel).toBe(PRESET_PLATFORM_LABELS.tiktok);
  });

  it('resolveAccountProfileHeroMeta returns connected keys and stat subtitle', () => {
    const profiles = createEmptyPlatformProfiles();
    profiles.tiktok = {
      platform: 'tiktok',
      status: 'linked',
      handle: 'skin.notes',
      followerCountLabel: '128k followers',
    };
    profiles.instagram = {
      platform: 'instagram',
      status: 'linked',
      handle: 'miaskinnotes',
      followerCountLabel: '145k followers',
    };

    const meta = resolveAccountProfileHeroMeta(
      {
        displayName: 'Mia',
        niche: 'Skincare',
        platforms: ['TikTok', 'Instagram'],
        platformProfiles: profiles,
      },
      'demo@example.com',
    );

    expect(meta.connectedKeys).toEqual(['tiktok', 'instagram']);
    expect(meta.subtitle).toContain('TikTok · @skin.notes · 128k followers');
    expect(meta.subtitle).toContain('Instagram · @miaskinnotes · 145k followers');
  });

  it('resolveAccountProfileHeroMeta falls back to email when no platforms', () => {
    const meta = resolveAccountProfileHeroMeta(null, 'demo@example.com');
    expect(meta.connectedKeys).toEqual([]);
    expect(meta.subtitle).toBe('demo@example.com');
  });
});
