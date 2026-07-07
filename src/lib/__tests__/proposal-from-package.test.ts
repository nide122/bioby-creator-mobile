import type { RateCardPackage } from '@/src/types/domain';
import { buildProposalFromPackage, isProposalPreviewDraft, resolveDefaultProposalPackageId } from '@/src/lib/proposal-from-package';

const samplePackage: RateCardPackage = {
  id: 'launch-bundle',
  name: 'Launch bundle',
  tagline: 'Recommended for product launches',
  priceLabel: '$2.8k–$4.8k',
  deliverables: ['2 short-form videos', '2 script rounds'],
  revisionRounds: '2 script rounds + 1 final edit round',
  usageRights: 'Organic campaign use for 90 days',
  prepayLabel: '50% prepay',
  addOnHint: 'Paid usage priced separately',
  highlights: ['Balances proof and timing'],
  recommended: true,
};

describe('proposal-from-package', () => {
  it('picks the recommended package by default', () => {
    expect(resolveDefaultProposalPackageId([{ ...samplePackage, recommended: false }, samplePackage])).toBe(
      'launch-bundle',
    );
  });

  it('detects preview drafts that are not persisted yet', () => {
    expect(isProposalPreviewDraft({ preview: true, saved: false } as never)).toBe(true);
    expect(isProposalPreviewDraft({ preview: false, saved: true } as never)).toBe(false);
  });

  it('builds a proposal preview from a rate card package', () => {
    const proposal = buildProposalFromPackage('proposal-1', samplePackage, {
      brandHint: 'ClearSkin Lab',
      opportunityId: '42',
      creatorDisplayName: 'Mia',
    });

    expect(proposal.id).toBe('proposal-1');
    expect(proposal.packageId).toBe('launch-bundle');
    expect(proposal.opportunityId).toBe('42');
    expect(proposal.title).toBe('Launch bundle proposal');
    expect(proposal.skuLines[0]?.priceLabel).toBe('$2.8k–$4.8k');
    expect(proposal.skuLines[1]?.platform).toBe('Add-on');
  });
});
