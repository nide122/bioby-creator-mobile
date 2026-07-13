import type { TFunction } from 'i18next';

import {
  downloadProposalPdfFile,
  shareProposalPdfFile,
} from '@/src/lib/proposal-pdf-export';
import { buildProposalPdfHtml } from '@/src/lib/proposal-pdf-template';
import type { ProposalPreview } from '@/src/types/domain';

export function buildProposalPdfFilename(proposal: ProposalPreview): string {
  const slug = proposal.title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'proposal';
  return `${slug}-v${proposal.version ?? proposal.proposedVersion ?? 1}.pdf`;
}

export async function downloadProposalPdf(proposal: ProposalPreview, t: TFunction): Promise<void> {
  await downloadProposalPdfFile(
    buildProposalPdfHtml(proposal, t),
    buildProposalPdfFilename(proposal),
    t('proposalPdf.downloadDialogTitle'),
  );
}

export async function shareProposalPdf(proposal: ProposalPreview, t: TFunction): Promise<void> {
  await shareProposalPdfFile(
    buildProposalPdfHtml(proposal, t),
    buildProposalPdfFilename(proposal),
    t('proposalPdf.shareDialogTitle'),
  );
}
