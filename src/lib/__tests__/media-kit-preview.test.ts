import { buildMediaKitPreview, mediaKitRatesSyncedFromPackages, mergeMediaKitCases, normalizeStartingPrice, slugifyDisplayName } from '@/src/lib/media-kit-preview';
import { trustMetricToPublicProofItem } from '@/src/lib/public-proof';
import type { BattleReportSummary, MediaKitDocument, TrustMetricCard } from '@/src/types/domain';

const TRUST_METRIC: TrustMetricCard = {
  id: 'tm-punctual',
  label: 'On-time publish',
  value: '96%',
  trendNote: 'Rolling 90 days',
  disclaimer: 'Demo only.',
};

const SHAREABLE_REPORT: BattleReportSummary = {
  id: 'report-spring-skincare',
  title: 'Spring skincare launch · Deal recap',
  metrics: ['+18% rate lift', '9.5 hours saved in back-and-forth'],
  lesson: 'Lock claims language before quoting.',
  shareableToMediaKit: true,
};

describe('media-kit-preview', () => {
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

  it('syncs profile nicheTags into brand preview about tags', () => {
    const preview = buildMediaKitPreview({
      document: {
        contactEmail: 'partnerships@example.com',
        inviteCta: 'Email with brief and budget.',
        aboutTags: ['test', 'test', 'test'],
      },
      profile: {
        displayName: 'Mia',
        niche: 'Skincare',
        nicheTags: ['Skincare reviews', 'Sensitive skin', 'Ingredients'],
        platforms: [],
      },
    });

    expect(preview.aboutTags).toEqual(['Skincare reviews', 'Sensitive skin', 'Ingredients']);
    expect(preview.headline).toBe('Mia | Skincare reviews · Sensitive skin');
  });

  it('syncs profile-linked platforms into brand preview channels', () => {
    const preview = buildMediaKitPreview({
      document: {
        contactEmail: 'partnerships@example.com',
        inviteCta: 'Email with brief and budget.',
        platforms: [],
      },
      profile: {
        displayName: 'Mia',
        niche: 'Skincare',
        platforms: ['TikTok'],
        platformProfiles: {
          youtube: { platform: 'youtube', status: 'empty' },
          tiktok: {
            platform: 'tiktok',
            status: 'linked',
            handle: 'home.finds',
            followerCountLabel: '210K followers',
            avgViews: 50000,
          },
          instagram: { platform: 'instagram', status: 'empty' },
        },
      },
    });

    expect(preview.platforms).toHaveLength(1);
    expect(preview.platforms[0].name).toBe('TikTok');
    expect(preview.platforms[0].handle).toBe('home.finds');
    expect(preview.platforms[0].monthlyViews).toBe('~50K views / mo');
  });

  it('builds contactUrl with backend-compatible slugify', () => {
    const preview = buildMediaKitPreview({
      document: {
        contactEmail: 'partnerships@example.com',
        inviteCta: 'Email with brief and budget.',
      },
      profile: { displayName: 'Mia Skin Notes', niche: 'Skincare', platforms: [] },
    });

    expect(slugifyDisplayName('Mia Skin Notes')).toBe('mia-skin-notes');
    expect(preview.contactUrl).toBe('https://example.test/c/mia-skin-notes');
    expect(preview.headline).toBe('Mia Skin Notes | Creator');
  });

  it('merges shareable battle reports when sync is enabled', () => {
    const document: MediaKitDocument = {
      contactEmail: 'partnerships@example.com',
      inviteCta: 'Email with brief and budget.',
      syncBattleReports: true,
      cases: [],
    };

    const preview = buildMediaKitPreview({
      document,
      battleReports: [SHAREABLE_REPORT],
    });

    expect(preview.cases).toHaveLength(1);
    expect(preview.cases[0].id).toBe('report-spring-skincare');
  });

  it('includes enabled trust public proofs in preview', () => {
    const proof = trustMetricToPublicProofItem(TRUST_METRIC);
    const preview = buildMediaKitPreview({
      document: {
        contactEmail: 'partnerships@example.com',
        inviteCta: 'Email with brief and budget.',
        enabledPublicProofIds: [proof.id],
      },
      publicProofCatalog: [proof],
    });

    expect(preview.publicProofs).toHaveLength(1);
    expect(preview.publicProofs?.[0].value).toBe('96%');
  });

  it('dedupes imported battle report ids', () => {
    const merged = mergeMediaKitCases(
      [
        {
          id: 'report-spring-skincare',
          title: 'Already imported',
          industry: 'Campaign recap',
          outcomeNote: '+18% rate lift',
        },
      ],
      [SHAREABLE_REPORT],
      true,
      'Campaign recap'
    );

    expect(merged).toHaveLength(1);
  });

  it('copies battle report metrics into resultSummary when merging cases', () => {
    const merged = mergeMediaKitCases([], [SHAREABLE_REPORT], true, 'Campaign recap');
    expect(merged[0].resultSummary).toBe('+18% rate lift');
  });

  it('always treats Rate Card as the Media Kit pricing source', () => {
    expect(
      mediaKitRatesSyncedFromPackages({
        syncRateCards: true,
        platformRates: [],
      })
    ).toBe(true);
    expect(mediaKitRatesSyncedFromPackages({ platformRates: [
      { id: 'r1', platform: 'TikTok', formatKey: 'short_video', priceLabel: '$1k' },
    ] })).toBe(true);
  });

  it('uses only selected Rate Card packages and ignores legacy platform rates', () => {
    const t = ((key: string) => (key === 'mediaKitShare.quoteOnRequest' ? '面议' : key)) as never;
    const preview = buildMediaKitPreview({
      document: {
        contactEmail: 'partnerships@example.com',
        inviteCta: 'Email with brief and budget.',
        publicPackageIds: ['launch'],
        platformRates: [
          { id: 'legacy', platform: 'Instagram', formatKey: 'short_video', priceLabel: '$999' },
        ],
      },
      rateCardPackages: [
        {
          id: 'launch', name: 'Launch package', tagline: 'Two videos', priceLabel: '$2,500',
          deliverables: [], revisionRounds: '', usageRights: '', prepayLabel: '', addOnHint: '', highlights: [],
        },
        {
          id: 'hidden', name: 'Hidden package', tagline: '', priceLabel: '$4,000',
          deliverables: [], revisionRounds: '', usageRights: '', prepayLabel: '', addOnHint: '', highlights: [],
        },
      ],
      t,
    });

    expect(preview.rateSummaries).toHaveLength(1);
    expect(preview.rateSummaries?.[0].title).toBe('Launch package');
    expect(preview.rateSummaries?.[0].startingPrice).toBe('$2,500起');
    expect(preview.servicesTable?.[0].service).toBe('Launch package');
  });

  it('normalizes legacy Chinese prefix prices from backend', () => {
    expect(normalizeStartingPrice('起 $2,500')).toBe('$2,500起');
    expect(normalizeStartingPrice('$2,500起')).toBe('$2,500起');
  });

  it('reformats legacy prefix prices coming from Rate Card packages', () => {
    const t = ((key: string) => (key === 'mediaKitShare.quoteOnRequest' ? '面议' : key)) as never;
    const preview = buildMediaKitPreview({
      document: {
        contactEmail: 'partnerships@example.com',
        inviteCta: 'Email with brief and budget.',
      },
      rateCardPackages: [{
        id: 'r1', name: 'Reel', tagline: 'Includes usage', priceLabel: '起 $2,500',
        deliverables: [], revisionRounds: '', usageRights: '', prepayLabel: '', addOnHint: '', highlights: [],
      }],
      t,
    });

    expect(preview.rateSummaries?.[0].startingPrice).toBe('$2,500起');
  });
});
