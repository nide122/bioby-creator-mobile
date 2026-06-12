import {
  buildMediaKitPdfFilename,
  buildShareHtml,
  buildShareMessage,
} from '@/src/lib/media-kit-share';
import { MEDIA_KIT_PDF_SINGLE_PAGE_HEIGHT_PX } from '@/src/lib/media-kit-pdf.constants';
import type { MediaKitPreview } from '@/src/types/domain';

const KIT: MediaKitPreview = {
  headline: 'Mia Skin Notes | Creator',
  bio: 'Skincare creator focused on honest reviews.',
  aboutTags: ['Skincare', 'Beauty'],
  contactEmail: 'partnerships@example.com',
  contactUrl: 'https://example.test/c/mia-skin-notes',
  heroStats: [{ label: 'Followers', value: '120K' }],
  audience: {
    topLocations: 'US, UK',
    genderAge: 'Women 25–34',
    postingCadence: '3x / week',
  },
  platforms: [
    {
      name: 'Instagram',
      handle: 'miaskin',
      followersRange: '120K',
      monthlyViews: '450K views / mo',
      nicheNote: 'Reels + Stories',
    },
  ],
  rateSummaries: [{ id: 'r1', title: 'Reel', startingPrice: '$2,500', description: 'Includes usage' }],
  servicesTable: [{ service: 'Reel', fee: '$2,500' }],
  partnerships: ['Brand A'],
  cases: [
    {
      id: 'case-1',
      title: 'Spring launch',
      industry: 'Skincare',
      resultSummary: '+18% engagement',
    },
  ],
  inviteCta: 'Email with brief and budget.',
  paymentTerms: 'Net 30',
};

const t = ((key: string) => key) as never;

describe('media-kit-share', () => {
  it('builds plain-text share copy with major sections', () => {
    const message = buildShareMessage(KIT, KIT.headline, KIT.bio, 'Footer', t);

    expect(message).toContain(KIT.headline);
    expect(message).toContain(KIT.contactUrl);
    expect(message).toContain('mediaKitShare.statsSection');
    expect(message).toContain('Spring launch — +18% engagement');
    expect(message).toContain('Footer');
  });

  it('builds HTML for PDF export with visible sections', () => {
    const html = buildShareHtml(
      KIT,
      KIT.headline,
      KIT.bio,
      'Footer',
      ['about', 'stats', 'channels', 'cases', 'contact'],
      t
    );

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('media-kit-section');
    expect(html).toContain(`${MEDIA_KIT_PDF_SINGLE_PAGE_HEIGHT_PX}px`);
    expect(html).not.toContain('page-break-before: always');
    expect(html).toContain('Mia Skin Notes | Creator');
    expect(html).toContain('120K');
    expect(html).toContain('Spring launch');
    expect(html).toContain('partnerships@example.com');
    expect(html).toContain('Footer');
  });

  it('sanitizes PDF filename from headline', () => {
    expect(buildMediaKitPdfFilename('Mia Skin Notes | Creator')).toBe('mia-skin-notes-creator.pdf');
  });
});
