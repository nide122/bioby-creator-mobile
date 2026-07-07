import {
  buildReplyTemplateContext,
  formatPackagesSummary,
  resolvePrimaryRisk,
} from '@/src/lib/reply-template-context';

describe('reply-template-context', () => {
  it('builds context from thread and rate card packages', () => {
    const context = buildReplyTemplateContext({
      opportunityId: '42',
      thread: {
        id: '42',
        brandName: 'Glow Recipe',
        subject: 'TikTok launch',
        budgetDisplay: '$2k–$3k',
        usageRights: ['30-day paid social'],
        packages: [
          {
            items: [{ name: '1 TikTok', platform: 'tiktok', contentFormat: 'short_video', quantity: 1 }],
            quoteDisplay: '$2,500',
          },
        ],
        riskLabel: 'Tight timeline',
      },
      creatorName: 'Alex',
      rateCardPackages: [
        {
          id: 'pkg-1',
          name: 'Starter',
          tagline: '',
          priceLabel: '$3,500',
          deliverables: [],
          revisionRounds: '',
          usageRights: '',
          prepayLabel: '',
          addOnHint: '',
          highlights: [],
          recommended: true,
        },
      ],
    });

    expect(context.opportunityId).toBe('42');
    expect(context.brandName).toBe('Glow Recipe');
    expect(context.deliverables).toBe('1 TikTok');
    expect(context.usageRights).toBe('30-day paid social');
    expect(context.packagesSummary).toBe('1 TikTok ($2,500)');
    expect(context.primaryRisk).toBe('Tight timeline');
    expect(context.recommendedPackage).toBe('Starter — $3,500');
    expect(context.rateCardFloor).toBe('$3,500');
    expect(context.budgetDisplay).toBe('$2k–$3k');
    expect(context.creatorName).toBe('Alex');
  });

  it('prefers displayBrandName over mailbox sender in thread.brandName', () => {
    const context = buildReplyTemplateContext({
      thread: {
        brandName: 'partnerships@glow.com',
        subject: 'Spring TikTok collab',
        claimedBrandName: 'Glow Recipe',
      },
      displayBrandName: 'Glow Recipe',
    });

    expect(context.brandName).toBe('Glow Recipe');
  });

  it('resolves claimed brand when thread.brandName is an email', () => {
    const context = buildReplyTemplateContext({
      thread: {
        brandName: 'partnerships@glow.com',
        subject: 'Spring TikTok collab',
        claimedBrandName: 'Glow Recipe',
      },
    });

    expect(context.brandName).toBe('Glow Recipe');
  });

  it('formats package summary and resolves primary risk from flags', () => {
    expect(
      formatPackagesSummary([
        { items: [{ name: 'Reel', platform: 'instagram', contentFormat: 'short_video', quantity: 1 }] },
      ]),
    ).toBe('Reel');
    expect(
      resolvePrimaryRisk({
        riskFlags: [
          { id: '1', label: 'Info note', severity: 'info' },
          { id: '2', label: 'Usage concern', severity: 'warning' },
        ],
      }),
    ).toBe('Usage concern');
  });
});
