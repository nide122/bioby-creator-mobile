import {
  assessMediaKitCompletion,
  formatMediaKitHubDetail,
  mediaKitHubNeedsAttention,
} from '@/src/lib/media-kit-completion';
import type { MediaKitDocument } from '@/src/types/domain';

const t = ((key: string, opts?: { count?: number }) => {
  if (key === 'assetsScreen.summaries.mediaKitReadyDetail') return `${opts?.count} cases · link ready`;
  if (key === 'assetsScreen.summaries.mediaKitPricingSynced') return 'pricing synced';
  const labels: Record<string, string> = {
    'assetsScreen.summaries.mediaKitMissingEmail': 'Add contact email',
    'assetsScreen.summaries.mediaKitMissingInvite': 'Add invite CTA',
    'assetsScreen.summaries.mediaKitMissingPlatforms': 'Add a channel',
    'assetsScreen.summaries.mediaKitMissingDisplayName': 'Set display name',
    'assetsScreen.summaries.mediaKitNoCases': 'Add case studies',
    'assetsScreen.summaries.mediaKitLinkReady': 'Link ready',
  };
  return labels[key] ?? key;
}) as never;

const READY_DOC: MediaKitDocument = {
  contactEmail: 'partnerships@example.com',
  inviteCta: 'Email with brief, timeline, and budget range.',
  platforms: [{ name: 'TikTok', followersRange: '100k', nicheNote: 'Skincare' }],
  cases: [{ id: 'c1', title: 'Launch', industry: 'Beauty', outcomeNote: 'On time' }],
};

describe('media-kit-completion', () => {
  it('flags missing contact email first', () => {
    const completion = assessMediaKitCompletion(
      { ...READY_DOC, contactEmail: '' },
      'Mia Skin Notes'
    );
    expect(completion.missingField).toBe('contactEmail');
    expect(mediaKitHubNeedsAttention(completion)).toBe(true);
  });

  it('flags missing display name for generic slug', () => {
    const completion = assessMediaKitCompletion(READY_DOC, 'Creator');
    expect(completion.missingField).toBe('displayName');
  });

  it('marks ready when essentials and cases exist', () => {
    const completion = assessMediaKitCompletion(READY_DOC, 'Mia Skin Notes');
    expect(completion.status).toBe('ready');
    expect(completion.caseCount).toBe(1);
    expect(mediaKitHubNeedsAttention(completion)).toBe(false);
  });

  it('formats ready detail with case count and pricing sync', () => {
    const completion = assessMediaKitCompletion(
      {
        ...READY_DOC,
        syncRateCards: true,
        platformRates: [],
      },
      'Mia Skin Notes'
    );
    expect(formatMediaKitHubDetail(completion, t)).toBe('1 cases · link ready · pricing synced');
  });

  it('keeps pricing synced even when legacy platform rates remain stored', () => {
    const completion = assessMediaKitCompletion(
      {
        ...READY_DOC,
        syncRateCards: true,
        platformRates: [{ id: 'r1', platform: 'TikTok', formatKey: 'short_video', priceLabel: '$1k' }],
      },
      'Mia Skin Notes'
    );
    expect(completion.pricingSyncedVisible).toBe(true);
    expect(formatMediaKitHubDetail(completion, t)).toBe('1 cases · link ready · pricing synced');
  });

  it('formats missing-field detail with optional pricing sync suffix', () => {
    const completion = assessMediaKitCompletion(
      { contactEmail: '', syncRateCards: true, platformRates: [] },
      'Mia Skin Notes'
    );
    expect(formatMediaKitHubDetail(completion, t)).toBe('Add contact email · pricing synced');
  });
});
