import { MOCK_DEAL_PAYMENT_LINES } from '@/src/data/mock-deal-catalog';
import type { DisputeCase, PaymentLineItem, PaymentsOverview } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

export const MOCK_PAYMENT_LINES: PaymentLineItem[] = MOCK_DEAL_PAYMENT_LINES;

export async function fetchMockPayments(options?: { empty?: boolean }): Promise<PaymentLineItem[]> {
  await mockDelay(180);
  if (options?.empty) return [];
  return MOCK_PAYMENT_LINES.map((p) => ({ ...p }));
}

export async function fetchMockPaymentsOverview(options?: { empty?: boolean }): Promise<PaymentsOverview> {
  await mockDelay(100);
  const currency: PaymentsOverview['currency'] = 'USD';
  if (options?.empty) {
    return {
      currency,
      inEscrowCents: 0,
      pendingVerificationCents: 0,
      awaitingSettlementCents: 0,
      footnote: 'No active payment items yet.',
    };
  }
  let inEscrowCents = 0;
  let pendingVerificationCents = 0;
  let awaitingSettlementCents = 0;
  for (const line of MOCK_PAYMENT_LINES) {
    if (line.phase === 'escrowed') {
      inEscrowCents += line.amountCents;
    } else if (line.phase === 'pending_verification') {
      pendingVerificationCents += line.amountCents;
    } else if (line.phase === 'awaiting_prepay') {
      awaitingSettlementCents += line.amountCents;
    }
  }
  return {
    currency,
    inEscrowCents,
    pendingVerificationCents,
    awaitingSettlementCents,
    footnote: 'Amounts update as each deal moves forward.',
  };
}

let disputesFailOnce = false;

/** Make the next dispute fetch fail once, for retry-state testing. */
export function primeMockDisputesFailure() {
  disputesFailOnce = true;
}

const MOCK_DISPUTES_FULL: DisputeCase[] = [
  {
    id: 'dsp-1',
    title: 'Publish window dispute',
    state: 'open',
    causeCode: 'PUBLISH_WINDOW',
    slaHint: 'Links and timestamps are being checked against the packet.',
    nextActionLabel: 'Add platform screenshot + publish timestamp.',
    evidenceItems: [
      {
        id: 'ev-1',
        label: 'Post link and visibility screenshot',
        status: 'submitted',
        hint: 'Include path from profile to post.',
      },
      {
        id: 'ev-2',
        label: 'Window alignment: delivery timeline',
        status: 'under_review',
        hint: 'Compare agreed window with actual publish time.',
      },
      {
        id: 'ev-3',
        label: 'Brand objection note, if any',
        status: 'missing',
      },
    ],
  },
  {
    id: 'dsp-2',
    title: 'Disclosure remediation',
    state: 'mediation',
    causeCode: 'DISCLOSURE_MISSING',
    slaHint: 'Disclosure proof can move this back into verification.',
    nextActionLabel: 'Upload revised first frame + pinned disclosure screenshot.',
    evidenceItems: [
      {
        id: 'ev-a',
        label: 'Revised cut with #ad frame',
        status: 'accepted',
      },
      {
        id: 'ev-b',
        label: 'Pinned disclosure screenshot',
        status: 'submitted',
      },
      {
        id: 'ev-c',
        label: 'Conversation summary, optional',
        status: 'missing',
      },
    ],
  },
];

export async function fetchMockDisputes(options?: { empty?: boolean }): Promise<DisputeCase[]> {
  await mockDelay(120);
  if (disputesFailOnce) {
    disputesFailOnce = false;
    throw new Error('Network is unstable. Try again.');
  }
  if (options?.empty) return [];
  return MOCK_DISPUTES_FULL.map((row) => ({
    ...row,
    evidenceItems: row.evidenceItems?.map((e) => ({ ...e })),
  }));
}
