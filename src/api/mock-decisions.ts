import type { DecisionCard } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

/**
 * Decision queue mock — ordered by priority (index 0 = most urgent).
 * Rule: payout > delivery > approval > opportunity > verification
 */
export const MOCK_DECISIONS: DecisionCard[] = [
  {
    id: 'dec-payout-beta',
    category: 'payout',
    entityName: 'TrailPeak Gear',
    headline: 'Release $3,200',
    aiNote: 'Upload publish proof to release escrow.',
    urgencyNote: 'Payout blocked until proof',
    amountLabel: '$3,200',
    sourceHint: 'Deal · Camping light unboxing',
    sourceHref: '/deal/mock-deal-beta/packet',
    actions: [
      { id: 'upload', label: 'Upload proof', style: 'primary', href: '/deal/mock-deal-beta/verification' },
      { id: 'later', label: 'Snooze', style: 'ghost' },
    ],
  },
  {
    id: 'dec-opportunity-skincare',
    category: 'opportunity',
    entityName: 'ClearSkin Lab',
    headline: 'Decide on ClearSkin Lab pitch',
    aiNote: 'High-value brief with claims review window — worth confirming rights before quote.',
    urgencyNote: 'Needs attention today',
    interruptReason: 'Claims need pre-review before quote.',
    leadValueBand: 'high_value',
    sourceHint: 'Inbox · 2 short videos | Claims need pre-review',
    sourceHref: '/inbox/thread-skincare',
    actions: [
      { id: 'open', label: 'Open thread', style: 'primary', href: '/inbox/thread-skincare' },
      { id: 'later', label: 'Snooze', style: 'ghost' },
    ],
  },
  {
    id: 'dec-opportunity-hardware',
    category: 'opportunity',
    entityName: 'TrailPeak Gear',
    headline: 'Decide on TrailPeak Gear pitch',
    aiNote: 'Broad usage and prepay still unclear — negotiate before committing dates.',
    leadValueBand: 'needs_negotiation',
    sourceHint: 'Inbox · Outdoor gear · long-term usage ask',
    sourceHref: '/inbox/thread-hardware',
    actions: [
      { id: 'open', label: 'Open thread', style: 'primary', href: '/inbox/thread-hardware' },
      { id: 'later', label: 'Snooze', style: 'ghost' },
    ],
  },
  {
    id: 'dec-opportunity-glow',
    category: 'opportunity',
    entityName: 'Glow Recipe',
    headline: 'Follow up on Glow Recipe delivery',
    aiNote: 'Escrow is funded — track deliverables and publish timing in the deal packet.',
    leadValueBand: 'needs_negotiation',
    sourceHint: 'Inbox · TikTok · Watermelon serum launch',
    sourceHref: '/inbox/thread-glow-recipe',
    actions: [
      { id: 'open', label: 'Open thread', style: 'primary', href: '/inbox/thread-glow-recipe' },
      { id: 'later', label: 'Snooze', style: 'ghost' },
    ],
  },
];

/** Static demo lines — localized strings built in `useDecisionQueue` via `today.mockAiHandled.*` */
export const MOCK_AI_HANDLED_TODAY_KEYS = ['line1', 'line2', 'line3', 'line4'] as const;

export async function fetchMockDecisions(): Promise<DecisionCard[]> {
  await mockDelay(180);
  return MOCK_DECISIONS.map((d) => ({ ...d }));
}
