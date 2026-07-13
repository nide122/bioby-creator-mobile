import type { TFunction } from 'i18next';

import { buildProposalPdfHtml } from '@/src/lib/proposal-pdf-template';
import type { ProposalPreview } from '@/src/types/domain';

const translations: Record<string, string> = {
  'proposalPdf.documentLanguage': 'en',
  'proposalPdf.eyebrow': 'Collaboration Proposal',
  'proposalPdf.summaryTitle': 'Proposal summary',
  'proposalPdf.quoteTitle': 'Quote and deliverables',
  'proposalPdf.deliverable': 'Deliverable',
  'proposalPdf.timeline': 'Timeline',
  'proposalPdf.price': 'Price',
  'proposalPdf.termsTitle': 'Collaboration terms',
  'proposalPdf.rightsTitle': 'Usage rights',
  'proposalPdf.paymentTitle': 'Payment',
  'proposalPdf.riskTitle': 'Important notes',
  'proposalPdf.creatorTitle': 'Creator snapshot',
  'proposalPdf.footer': 'Final terms remain subject to the executed agreement.',
};

const t = ((key: string, options?: Record<string, unknown>) => {
  if (key === 'proposalPdf.version') return `Proposal v${options?.version}`;
  if (key === 'proposalPdf.brand') return `Brand: ${options?.brand}`;
  if (key === 'proposalPdf.creator') return `Creator: ${options?.creator}`;
  return translations[key] ?? key;
}) as unknown as TFunction;

const proposal: ProposalPreview = {
  id: 'internal-id-not-for-pdf',
  opportunityId: 'internal-opportunity-not-for-pdf',
  title: 'Glow & <Launch>',
  brandHint: 'Glow Labs',
  creatorDisplayName: 'Creator Name',
  executiveSummary: 'A concise collaboration proposal.',
  version: 2,
  skuLines: [{
    id: 'sku-1',
    platform: 'TikTok',
    deliverable: 'One short-form video',
    turnaroundLabel: '14 days',
    priceLabel: 'USD 5,000',
  }],
  rightsBullets: ['30 days paid usage'],
  paymentBullets: ['50% upfront'],
  riskBullets: ['One revision included'],
};

describe('buildProposalPdfHtml', () => {
  it('renders public proposal content and escapes user text', () => {
    const html = buildProposalPdfHtml(proposal, t);

    expect(html).toContain('Glow &amp; &lt;Launch&gt;');
    expect(html).toContain('Proposal v2');
    expect(html).toContain('USD 5,000');
    expect(html).toContain('30 days paid usage');
  });

  it('does not expose internal proposal identifiers', () => {
    const html = buildProposalPdfHtml(proposal, t);

    expect(html).not.toContain('internal-id-not-for-pdf');
    expect(html).not.toContain('internal-opportunity-not-for-pdf');
  });
});

