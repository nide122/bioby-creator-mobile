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
    amountLabel: '$3,200',
    sourceHint: 'Deal · Camping light unboxing',
    sourceHref: '/deal/mock-deal-beta/packet',
    actions: [
      { id: 'upload', label: 'Upload proof', style: 'primary', href: '/deal/mock-deal-beta/verification' },
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
