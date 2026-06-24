import type { DealPacketView, DealTermRow } from '@/src/types/deal-workflow';
import type { DealSummary, InboxThreadDetail, PaymentLineItem } from '@/src/types/domain';

/** Deal mock row plus optional originating inbox thread id (商机 → Deal 主链路). */
export type MockDealRecord = DealSummary & {
  opportunityThreadId?: string;
};

const STANDARD_DISCLOSURE: DealTermRow = {
  label: 'Disclosure',
  value: '#ad in caption + pinned comment',
};

function terms(
  deliverables: string,
  publishWindow: string,
  usageRights: string,
): DealTermRow[] {
  return [
    { label: 'Deliverables', value: deliverables },
    { label: 'Publish window', value: publishWindow },
    STANDARD_DISCLOSURE,
    { label: 'Usage rights', value: usageRights },
  ];
}

function deliveryTimeline(
  roughDue: string,
  feedbackNote: string,
): NonNullable<DealPacketView['packet']['delivery']> {
  return {
    timeline: [
      { id: 'brief', title: 'Brief locked', due: 'Done', status: 'done', owner: 'You', note: 'Aligned to packet.' },
      { id: 'script', title: 'Script approved', due: 'Done', status: 'done', owner: 'Creator', note: 'Two revision rounds included.' },
      {
        id: 'rough-cut',
        title: 'Rough cut review',
        due: roughDue,
        status: 'current',
        owner: 'Brand',
        note: '48h review window.',
      },
      {
        id: 'final',
        title: 'Final delivery',
        due: 'After approval',
        status: 'upcoming',
        owner: 'Creator',
        note: 'Move to verification after upload.',
      },
    ],
    uploads: [
      { id: 'script', title: 'Script v2', state: 'Approved' },
      { id: 'rough', title: 'Rough cut v1', state: 'In review' },
      { id: 'final', title: 'Final export', state: 'Not started' },
    ],
    feedbackNote,
  };
}

function verificationBlock(payoutHint: string): NonNullable<DealPacketView['packet']['verification']> {
  return {
    evidence: [
      { id: 'post-link', status: 'missing' },
      { id: 'screenshot', status: 'missing' },
      { id: 'metrics', status: 'missing' },
    ],
    checklist: [
      { id: 'fit', passed: true },
      { id: 'quality', passed: true },
      { id: 'response', passed: true },
      { id: 'published', passed: true },
      { id: 'format', passed: false },
      { id: 'access', passed: true },
      { id: 'compliance', passed: true },
    ],
    payoutHint,
  };
}

function packet(
  deal: MockDealRecord,
  deliverables: DealTermRow[],
  extras?: Pick<DealPacketView['packet'], 'delivery' | 'verification'>,
): DealPacketView {
  return {
    dealId: deal.id,
    title: deal.title,
    brandPlaceholder: deal.brandPlaceholder,
    packet: {
      summary: deal.outcomeSummary ?? deal.nextMilestone ?? '',
      deliverables,
      ...extras,
    },
  };
}

const ts = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

/** Primary deal list for local demo workspace — covers all escrow phases. */
export const MOCK_DEAL_CATALOG: MockDealRecord[] = [
  {
    id: 'mock-deal-recommended-01',
    brandPlaceholder: 'Luminary Skincare',
    title: 'Barrier repair serum · 3-video series',
    escrowPhase: 'awaiting_prepay',
    nextMilestone: 'Accept to lock $4.8k prepay.',
    outcomeSummary: 'High match with your skincare content. Prepay ready to escrow.',
    source: 'recommended',
    recommendBadge: 'Strong fit',
    recommendReasons: ['Skincare niche match', 'Budget above recent median', 'Deliverables match your short-form workflow'],
    recommendPayoutNote: '100% prepay can be escrowed before production.',
    recommendRiskNote: 'Claims review required. Keep usage limited to campaign scope unless priced separately.',
  },
  {
    id: 'mock-deal-recommended-02',
    brandPlaceholder: 'Volta Energy',
    title: 'EV lifestyle · Instagram Reels x2',
    escrowPhase: 'awaiting_prepay',
    nextMilestone: 'Review packet and confirm deliverables.',
    outcomeSummary: 'Your outdoor audience fits their target demo.',
    source: 'recommended',
    recommendBadge: 'Audience fit',
    recommendReasons: ['Outdoor lifestyle audience match', 'Brand accepts escrow-first delivery', 'Themes reusable in Media Kit'],
    recommendPayoutNote: 'Prepay required before delivery dates are committed.',
    recommendRiskNote: 'Confirm location, usage term, and whether brand needs paid social edits.',
  },
  {
    id: 'mock-deal-alpha',
    opportunityThreadId: 'thread-skincare',
    brandPlaceholder: 'ClearSkin Lab',
    title: '2 short videos | Claims review',
    escrowPhase: 'in_execution',
    nextMilestone: 'Submit rough cut by May 22, 12:00. Review window: 48h.',
    outcomeSummary: 'Deliver and publish against packet, then move to verification.',
    source: 'self',
  },
  {
    id: 'mock-deal-beta',
    opportunityThreadId: 'thread-hardware',
    brandPlaceholder: 'TrailPeak Gear',
    title: 'Camping light unboxing + overlay',
    escrowPhase: 'pending_verification',
    nextMilestone: 'Add first-day metrics before final verification.',
    outcomeSummary: 'Post link submitted. Screenshots and metrics still needed.',
    source: 'self',
  },
  {
    id: 'mock-deal-glow',
    opportunityThreadId: 'thread-glow-recipe',
    brandPlaceholder: 'Glow Recipe',
    title: 'TikTok · Watermelon serum launch',
    escrowPhase: 'in_execution',
    nextMilestone: 'Draft submitted; waiting on PR manager approval.',
    outcomeSummary: 'Must mention watermelon extract in first 5 seconds. No competing skincare on screen.',
    source: 'self',
  },
  {
    id: 'mock-deal-cerave',
    opportunityThreadId: 'thread-cerave',
    brandPlaceholder: 'CeraVe',
    title: 'YouTube integration · $3,500 offer',
    escrowPhase: 'escrowed',
    nextMilestone: 'Prepay locked. Start script draft this week.',
    outcomeSummary: 'High-value lead above your rate floor. 50% prepay is in escrow.',
    source: 'self',
  },
  {
    id: 'mock-deal-bloom',
    opportunityThreadId: 'thread-bloom-co',
    brandPlaceholder: 'Bloom & Co',
    title: 'Spring reset · 2 Reels + Stories',
    escrowPhase: 'awaiting_prepay',
    nextMilestone: 'Confirm packet and collect 50% prepay before shoot.',
    outcomeSummary: 'Terms confirmed from inbox brief. Waiting on brand finance to fund escrow.',
    source: 'self',
  },
  {
    id: 'mock-deal-fitform',
    opportunityThreadId: 'thread-fitform',
    brandPlaceholder: 'FitForm Athletics',
    title: 'Home workout series · 3 TikToks',
    escrowPhase: 'in_execution',
    nextMilestone: 'Brand reviewing script v2 — respond by Thursday.',
    outcomeSummary: 'Production started. Keep usage limited to organic campaign per packet.',
    source: 'self',
  },
  {
    id: 'mock-deal-petite',
    opportunityThreadId: 'thread-petite-paris',
    brandPlaceholder: 'Petite Paris Travel',
    title: 'Paris hotel stay · vlog integration',
    escrowPhase: 'pending_verification',
    nextMilestone: 'Upload first-day views + pinned #ad screenshot.',
    outcomeSummary: 'Final cut approved. Verification checklist is partially complete.',
    source: 'self',
  },
  {
    id: 'mock-deal-maison',
    opportunityThreadId: 'thread-maison-lune',
    brandPlaceholder: 'Maison Lune',
    title: 'Fragrance unboxing · Spark Ads ask',
    escrowPhase: 'disputed',
    nextMilestone: 'Mediation: clarify Spark Ads usage vs paid add-on.',
    outcomeSummary: 'Brand requested 30-day Spark Ads without separate fee. Dispute open.',
    source: 'self',
  },
  {
    id: 'mock-deal-gamma',
    opportunityThreadId: 'thread-cloudfield',
    brandPlaceholder: 'CloudField Coffee',
    title: 'Livestream read reshoot',
    escrowPhase: 'remediation',
    nextMilestone: 'Review fixes: replacement, extension, or refund path.',
    outcomeSummary: 'Remediation in progress. Keep evidence and timeline clean.',
    source: 'self',
  },
  {
    id: 'mock-deal-nordstrom',
    opportunityThreadId: 'thread-nordstrom-home',
    brandPlaceholder: 'Nordstrom Home',
    title: 'Linen collection · room makeover',
    escrowPhase: 'settled',
    nextMilestone: 'Deal closed. Archive packet for tax records.',
    outcomeSummary: 'All deliverables verified and final payout released.',
    source: 'self',
  },
  {
    id: 'mock-deal-harbor',
    opportunityThreadId: 'thread-harbor-tea',
    brandPlaceholder: 'Harbor Tea Co.',
    title: 'Morning ritual · 1 Reel + 3 Stories',
    escrowPhase: 'settled',
    nextMilestone: 'Closed · optional performance recap available.',
    outcomeSummary: 'Gift-turned-paid deal completed on time with full escrow release.',
    source: 'self',
  },
];

export const MOCK_DEAL_PACKET_BY_ID: Record<string, DealPacketView> = Object.fromEntries(
  MOCK_DEAL_CATALOG.map((deal) => {
    switch (deal.id) {
      case 'mock-deal-alpha':
        return [
          deal.id,
          packet(deal, terms('2 short-form videos + pinned #ad disclosure', 'First publish within 12 business days', 'Organic + owned channels · 90 days'), {
            delivery: deliveryTimeline('Due May 22', 'Brand is reviewing rough cut v1.'),
          }),
        ];
      case 'mock-deal-beta':
        return [
          deal.id,
          packet(deal, terms('1 unboxing + overlay edit', 'Within 10 business days', 'Organic · 90 days'), {
            verification: verificationBlock('Release after verification passes.'),
          }),
        ];
      case 'mock-deal-glow':
        return [
          deal.id,
          packet(
            deal,
            terms(
              '1 x 45-second TikTok video',
              'Link in bio for 14 days after publish',
              'Organic TikTok + brand repost · 90 days',
            ),
            {
              delivery: deliveryTimeline('Due Jun 4', 'PR manager reviewing draft — creative control on hook wording.'),
            },
          ),
        ];
      case 'mock-deal-cerave':
        return [
          deal.id,
          packet(
            deal,
            terms(
              '1 YouTube integration (60–90s)',
              'Publish within 21 days of script approval',
              'YouTube + owned channels · 6 months',
            ),
          ),
        ];
      case 'mock-deal-bloom':
        return [
          deal.id,
          packet(deal, terms('2 Instagram Reels + 3 Stories', 'Campaign window: Apr 28 – May 12', 'Organic Instagram · 120 days')),
        ];
      case 'mock-deal-fitform':
        return [
          deal.id,
          packet(deal, terms('3 TikTok workout clips', 'Rolling publish · one per week', 'Organic TikTok · 90 days'), {
            delivery: deliveryTimeline('Due Jun 8', 'Waiting on brand feedback for script v2.'),
          }),
        ];
      case 'mock-deal-petite':
        return [
          deal.id,
          packet(deal, terms('1 travel vlog + hotel highlight', 'Publish within 7 days of stay', 'Organic + tourism board repost · 60 days'), {
            verification: verificationBlock('Final 40% releases after metrics review.'),
          }),
        ];
      case 'mock-deal-maison':
        return [
          deal.id,
          packet(
            deal,
            terms('1 unboxing Reel + 2 Stories', 'Within 14 days of product receipt', 'Organic · 90 days + disputed Spark Ads clause'),
            { verification: verificationBlock('Escrow hold until usage dispute resolves.') },
          ),
        ];
      case 'mock-deal-gamma':
        return [
          deal.id,
          packet(deal, terms('Livestream host read + 1 clipped Reel reshoot', 'Reshoot within 5 business days', 'Organic live replay · 30 days'), {
            delivery: {
              timeline: [
                { id: 'live', title: 'Live read delivered', due: 'Done', status: 'done', owner: 'Creator', note: 'Original live completed.' },
                { id: 'issue', title: 'Brand flagged pacing', due: 'Done', status: 'done', owner: 'Brand', note: 'Requested reshoot segment.' },
                { id: 'reshoot', title: 'Reshoot in progress', due: 'Due Jun 2', status: 'current', owner: 'Creator', note: 'Replacement clip uploading.' },
                { id: 'release', title: 'Escrow decision', due: 'After reshoot', status: 'upcoming', owner: 'You', note: 'Choose extension or partial refund path.' },
              ],
              uploads: [
                { id: 'live', title: 'Live replay', state: 'Delivered' },
                { id: 'reshoot', title: 'Reshoot clip', state: 'Uploading' },
              ],
              feedbackNote: 'Brand wants tighter product mention in first 8 seconds.',
            },
          }),
        ];
      case 'mock-deal-nordstrom':
      case 'mock-deal-harbor':
        return [
          deal.id,
          packet(
            deal,
            deal.id === 'mock-deal-nordstrom'
              ? terms('1 room makeover Reel + 2 stills', 'Published May 3', 'Organic + Nordstrom Home channels · 180 days')
              : terms('1 morning ritual Reel + 3 Stories', 'Published Apr 18', 'Organic Instagram · 90 days'),
          ),
        ];
      default:
        return [
          deal.id,
          packet(deal, terms('See packet for deliverables', 'Per confirmed brief', 'Campaign-scoped organic use')),
        ];
    }
  }),
);

export const MOCK_DEAL_PAYMENT_LINES: PaymentLineItem[] = [
  {
    id: 'pay-alpha-prepay',
    dealId: 'mock-deal-alpha',
    label: 'Brand prepay (50%)',
    amountCents: 150_000,
    currency: 'USD',
    phase: 'escrowed',
    dealTitle: '2 short videos | Claims review',
    nextStepHint: 'Escrow active until final delivery milestone.',
    expectedReleaseLabel: 'After rough cut approval',
  },
  {
    id: 'pay-beta-payout',
    dealId: 'mock-deal-beta',
    label: 'Creator net payout',
    amountCents: 420_000,
    currency: 'USD',
    phase: 'pending_verification',
    dealTitle: 'Camping light unboxing + overlay',
    nextStepHint: 'Remaining payout releases after verification.',
    expectedReleaseLabel: 'After first-day metrics',
  },
  {
    id: 'pay-cerave-prepay',
    dealId: 'mock-deal-cerave',
    label: 'CeraVe prepay (50%)',
    amountCents: 175_000,
    currency: 'USD',
    phase: 'escrowed',
    dealTitle: 'YouTube integration · $3,500 offer',
    nextStepHint: 'Start production — balance due after verification.',
    expectedReleaseLabel: 'After publish + metrics',
  },
  {
    id: 'pay-glow-milestone',
    dealId: 'mock-deal-glow',
    label: 'Glow Recipe milestone',
    amountCents: 220_000,
    currency: 'USD',
    phase: 'escrowed',
    dealTitle: 'TikTok · Watermelon serum launch',
    nextStepHint: 'Funds release after final approval.',
    expectedReleaseLabel: 'After PR sign-off',
  },
  {
    id: 'pay-bloom-awaiting',
    dealId: 'mock-deal-bloom',
    label: 'Bloom & Co prepay',
    amountCents: 140_000,
    currency: 'USD',
    phase: 'awaiting_prepay',
    dealTitle: 'Spring reset · 2 Reels + Stories',
    nextStepHint: 'Waiting for brand to fund escrow.',
    expectedReleaseLabel: 'Before production start',
  },
  {
    id: 'pay-petite-balance',
    dealId: 'mock-deal-petite',
    label: 'Petite Paris balance',
    amountCents: 280_000,
    currency: 'USD',
    phase: 'pending_verification',
    dealTitle: 'Paris hotel stay · vlog integration',
    nextStepHint: 'Submit verification evidence to release.',
    expectedReleaseLabel: 'After checklist pass',
  },
  {
    id: 'pay-nordstrom-closed',
    dealId: 'mock-deal-nordstrom',
    label: 'Nordstrom Home final payout',
    amountCents: 310_000,
    currency: 'USD',
    phase: 'settled',
    dealTitle: 'Linen collection · room makeover',
    nextStepHint: 'Paid in full.',
    expectedReleaseLabel: 'Completed May 10',
  },
];

function pipelinePhaseForDeal(
  escrowPhase?: MockDealRecord['escrowPhase'],
  settled?: boolean,
): InboxThreadDetail['pipelinePhase'] {
  if (settled) return 'CLOSED';
  if (!escrowPhase) return undefined;
  switch (escrowPhase) {
    case 'awaiting_prepay':
      return 'CONTRACTED';
    case 'escrowed':
    case 'in_execution':
      return 'PRODUCTION';
    case 'pending_verification':
      return 'INVOICING';
    case 'remediation':
    case 'disputed':
      return 'REVISION';
    case 'settled':
      return 'CLOSED';
    default:
      return 'CONTRACTED';
  }
}

function contractedThread(
  id: string,
  brandName: string,
  subject: string,
  preview: string,
  daysAgo: number,
  extras: Partial<InboxThreadDetail>,
): InboxThreadDetail {
  const linkedDeal = MOCK_DEAL_CATALOG.find((deal) => deal.opportunityThreadId === id);
  const settled = linkedDeal?.escrowPhase === 'settled';
  return {
    id,
    subject,
    preview,
    updatedAtISO: ts(daysAgo),
    brandName,
    category: 'commercial',
    actionTier: 'DEVELOP',
    leadValueBand: settled ? 'archived' : linkedDeal ? 'needs_negotiation' : undefined,
    inboxPriority: settled ? 'p3' : linkedDeal ? 'p2' : undefined,
    priorityScore: settled ? 10 : linkedDeal ? 48 : undefined,
    classificationSortScore: 0,
    leadStage: 'quoted',
    briefStage: linkedDeal ? 'CONFIRMED' : undefined,
    dealId: linkedDeal?.id,
    pipelinePhase: pipelinePhaseForDeal(linkedDeal?.escrowPhase, settled),
    dealEscrowPhase: linkedDeal?.escrowPhase,
    budgetLabel: extras.budgetLabel,
    riskLabel: extras.riskLabel,
    ownerLabel: 'You',
    nextActionLabel: extras.nextActionLabel ?? 'Open deal packet',
    signals: extras.signals ?? [],
    riskFlags: extras.riskFlags ?? [],
    recommendedActions: extras.recommendedActions ?? ['Track progress in Deals hub.', 'Upload deliverables against packet.'],
    suggestedDraftIds: extras.suggestedDraftIds ?? { aiReply: 'draft-reply-01', quote: 'draft-quote-02' },
    extractionStatus: 'COMPLETE',
    extractionConfidence: 0.91,
    deliverables: extras.deliverables,
    usageRights: extras.usageRights,
    postingSchedule: extras.postingSchedule,
    messages: extras.messages ?? [
      {
        id: `${id}-m1`,
        sentAtISO: ts(daysAgo),
        fromLabel: `${brandName} · Partnership`,
        direction: 'inbound',
        snippet: preview,
      },
    ],
    ...extras,
  };
}

/** Inbox threads for opportunities that already escalated to deals (主链路后半段). */
export const MOCK_DEAL_OPPORTUNITY_THREADS: Record<string, InboxThreadDetail> = {
  'thread-glow-recipe': contractedThread(
    'thread-glow-recipe',
    'Glow Recipe',
    'TikTok · Watermelon serum launch',
    'Must mention watermelon extract in first 5 seconds. Link in bio for 14 days.',
    2,
    {
      budgetLabel: '$2.2k fixed',
      riskLabel: 'Medium · PR review',
      deliverables: ['1 x 45s TikTok', '#ad + pinned comment'],
      usageRights: ['Organic TikTok', 'Brand repost · 90 days'],
      postingSchedule: 'Publish by Jun 6',
      riskFlags: [
        {
          id: 'rf-compete',
          label: 'Do not show competing skincare brands',
          severity: 'warning',
          hint: 'Keep frame clean of other serum brands.',
        },
      ],
    },
  ),
  'thread-cerave': contractedThread(
    'thread-cerave',
    'CeraVe',
    'YouTube integration · $3,500 offer',
    'Integration in your next skincare routine video. 50% prepay available.',
    5,
    {
      actionTier: 'DECIDE_NOW',
      budgetLabel: '$3,500',
      riskLabel: 'Low · Above floor',
      deliverables: ['60–90s integration', 'Description link + #ad'],
      usageRights: ['YouTube + owned channels · 6 months'],
      postingSchedule: 'Within 21 days of script approval',
      recommendedActions: ['Script is approved — start filming.', 'Track escrow in Payments.'],
    },
  ),
  'thread-bloom-co': contractedThread(
    'thread-bloom-co',
    'Bloom & Co',
    'Spring reset · 2 Reels + Stories',
    'Brief confirmed. Finance will fund 50% prepay before shoot dates lock.',
    1,
    {
      budgetLabel: '$2.8k',
      riskLabel: 'Low',
      deliverables: ['2 Reels', '3 Stories'],
      nextActionLabel: 'Wait for prepay · then schedule shoot',
    },
  ),
  'thread-fitform': contractedThread(
    'thread-fitform',
    'FitForm Athletics',
    'Home workout series · 3 TikToks',
    'Script v2 sent. Brand feedback expected within 48h.',
    3,
    {
      budgetLabel: '$4.2k',
      deliverables: ['3 workout TikToks', 'Equipment visible in frame'],
      postingSchedule: 'One clip per week',
    },
  ),
  'thread-petite-paris': contractedThread(
    'thread-petite-paris',
    'Petite Paris Travel',
    'Paris hotel stay · vlog integration',
    'Final cut approved. Submit verification metrics to release balance.',
    7,
    {
      budgetLabel: '$2.8k + stay',
      leadStage: 'quoted',
      nextActionLabel: 'Submit verification proof',
    },
  ),
  'thread-maison-lune': contractedThread(
    'thread-maison-lune',
    'Maison Lune',
    'Fragrance unboxing · Spark Ads ask',
    'Contract includes 30-day Spark Ads usage — flagged for dispute.',
    4,
    {
      budgetLabel: '$1.9k',
      riskLabel: 'High · Spark Ads clause',
      riskFlags: [
        {
          id: 'rf-spark',
          label: 'AI Alert: 30 days free Spark Ads usage',
          severity: 'danger',
          hint: 'Quote paid social usage separately unless included in fee.',
        },
      ],
    },
  ),
  'thread-cloudfield': contractedThread(
    'thread-cloudfield',
    'CloudField Coffee',
    'Livestream read reshoot',
    'Brand requested reshoot after live read. Remediation path open.',
    6,
    {
      budgetLabel: '$1.2k',
      riskLabel: 'Medium · Remediation',
      nextActionLabel: 'Upload reshoot clip',
    },
  ),
  'thread-nordstrom-home': contractedThread(
    'thread-nordstrom-home',
    'Nordstrom Home',
    'Linen collection · room makeover',
    'Deal settled. All deliverables verified and paid.',
    30,
    {
      budgetLabel: '$3.1k',
      nextActionLabel: 'Archived · view packet',
      recommendedActions: ['Deal complete — archive for records.'],
    },
  ),
  'thread-harbor-tea': contractedThread(
    'thread-harbor-tea',
    'Harbor Tea Co.',
    'Morning ritual · 1 Reel + 3 Stories',
    'Gift sample converted to paid deal. Closed successfully.',
    45,
    {
      budgetLabel: '$950',
      nextActionLabel: 'Closed',
    },
  ),
};

export function dealForOpportunityThread(threadId: string): MockDealRecord | undefined {
  return MOCK_DEAL_CATALOG.find((deal) => deal.opportunityThreadId === threadId);
}
