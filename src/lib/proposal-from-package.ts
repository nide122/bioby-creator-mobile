import type { MediaKitPreview, ProposalPreview, RateCardPackage } from '@/src/types/domain';
import { toCreatorPublicSnapshot } from '@/src/lib/media-kit-creator-snapshot';

export type ProposalCreateInput = {
  packageId: string;
  opportunityId?: string;
  brandHint?: string;
  locale?: string;
  previewOnly?: boolean;
};

export function resolveDefaultProposalPackageId(packages: RateCardPackage[]): string | undefined {
  if (packages.length === 0) return undefined;
  return packages.find((pkg) => pkg.recommended)?.id ?? packages[0]?.id;
}

export function isProposalPreviewDraft(proposal: ProposalPreview): boolean {
  return proposal.preview === true || proposal.saved === false;
}

export function buildProposalFromPackage(
  proposalId: string,
  pkg: RateCardPackage,
  options: {
    brandHint?: string;
    opportunityId?: string;
    creatorDisplayName?: string;
    mediaKitPreview?: MediaKitPreview;
    previewOnly?: boolean;
  },
): ProposalPreview {
  const brandHint = options.brandHint?.trim() || 'Brand partnership';
  const deliverable = pkg.deliverables.length > 0 ? pkg.deliverables.join(', ') : pkg.name;
  const turnaround = pkg.revisionRounds.trim() || 'Timeline confirmed after brief review';
  const executiveSummary = pkg.tagline.trim()
    ? `Recommended package: ${pkg.name} — ${pkg.tagline.trim()}`
    : `Recommended package: ${pkg.name} — ${deliverable}`;

  const skuLines = [
    {
      id: 'sku-primary',
      platform: 'Package',
      deliverable,
      turnaroundLabel: turnaround,
      priceLabel: pkg.priceLabel.trim() || 'Quoted separately',
    },
  ];
  if (pkg.addOnHint.trim()) {
    skuLines.push({
      id: 'sku-addon',
      platform: 'Add-on',
      deliverable: pkg.addOnHint.trim(),
      turnaroundLabel: 'Scoped separately',
      priceLabel: 'Quoted separately',
    });
  }

  const rightsBullets = [pkg.usageRights.trim(), pkg.addOnHint.trim()].filter(Boolean);
  if (rightsBullets.length === 0) {
    rightsBullets.push('Usage rights are scoped in the proposal packet before send.');
  }

  const paymentBullets = [pkg.prepayLabel.trim(), 'This proposal is not a contract until both sides confirm the packet.']
    .filter(Boolean);

  const riskBullets = [
    ...pkg.highlights.filter(Boolean),
    'Claims may require brand legal review.',
    'Extra revision rounds may change fee or timing.',
  ];

  return {
    id: proposalId,
    packageId: pkg.id,
    opportunityId: options.opportunityId,
    title: `${pkg.name} proposal`,
    brandHint,
    creatorDisplayName: options.creatorDisplayName?.trim() || 'Creator',
    executiveSummary,
    skuLines,
    rightsBullets,
    paymentBullets,
    riskBullets,
    creatorSnapshot: options.mediaKitPreview ? toCreatorPublicSnapshot(options.mediaKitPreview) : undefined,
    preview: options.previewOnly ?? false,
    saved: !(options.previewOnly ?? false),
    generationSource: 'rules',
  };
}
