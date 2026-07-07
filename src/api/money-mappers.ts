import type { DisputeCaseView, PaymentLineView, PaymentsOverviewView } from '@/src/types/api';
import type {
  DisputeCase,
  DisputeEvidenceItem,
  DisputeEvidenceStatus,
  EscrowLifecyclePhase,
  PaymentLineItem,
  PaymentsOverview,
} from '@/src/types/domain';

const ESCROW_PHASES: EscrowLifecyclePhase[] = [
  'awaiting_prepay',
  'escrowed',
  'in_execution',
  'pending_verification',
  'settled',
  'remediation',
  'disputed',
];

const EVIDENCE_STATUSES: DisputeEvidenceStatus[] = [
  'missing',
  'submitted',
  'under_review',
  'accepted',
];

/** @deprecated Use PaymentLineView from `@/src/types/api`. */
export type PaymentLineDto = PaymentLineView;

/** @deprecated Use PaymentsOverviewView from `@/src/types/api`. */
export type PaymentsOverviewDto = PaymentsOverviewView;

/** @deprecated Use DisputeCaseView from `@/src/types/api`. */
export type DisputeCaseDto = DisputeCaseView;

function asPhase(value: string): EscrowLifecyclePhase {
  return ESCROW_PHASES.includes(value as EscrowLifecyclePhase)
    ? (value as EscrowLifecyclePhase)
    : 'in_execution';
}

function asEvidenceStatus(value: string): DisputeEvidenceStatus {
  return EVIDENCE_STATUSES.includes(value as DisputeEvidenceStatus)
    ? (value as DisputeEvidenceStatus)
    : 'missing';
}

export function mapPaymentLine(dto: PaymentLineView): PaymentLineItem {
  return {
    id: dto.id ?? '',
    dealId: dto.dealId ?? undefined,
    label: dto.label ?? '',
    amountCents: dto.amountCents ?? 0,
    currency: dto.currency === 'CNY' ? 'CNY' : 'USD',
    phase: asPhase(dto.phase ?? 'in_execution'),
    dealTitle: dto.dealTitle ?? undefined,
    nextStepHint: dto.nextStepHint ?? undefined,
    expectedReleaseLabel: dto.expectedReleaseLabel ?? undefined,
  };
}

export function mapPaymentsOverview(dto: PaymentsOverviewView): PaymentsOverview {
  return {
    currency: dto.currency === 'CNY' ? 'CNY' : 'USD',
    inEscrowCents: dto.inEscrowCents ?? 0,
    pendingVerificationCents: dto.pendingVerificationCents ?? 0,
    awaitingSettlementCents: dto.awaitingSettlementCents ?? 0,
    footnote: dto.footnote ?? '',
  };
}

export function mapDisputeCase(dto: DisputeCaseView): DisputeCase {
  const raw = dto.evidenceItems;
  const evidenceItems: DisputeEvidenceItem[] = Array.isArray(raw)
    ? raw.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? ''),
          label: String(row.label ?? ''),
          status: asEvidenceStatus(String(row.status ?? 'missing')),
          hint: row.hint != null ? String(row.hint) : undefined,
        };
      })
    : [];
  const state =
    dto.state === 'mediation' || dto.state === 'resolved' ? dto.state : 'open';
  return {
    id: dto.id ?? '',
    dealId: dto.dealId ?? undefined,
    title: dto.title ?? '',
    state,
    causeCode: dto.causeCode ?? undefined,
    slaHint: dto.slaHint ?? undefined,
    nextActionLabel: dto.nextActionLabel ?? undefined,
    evidenceItems: evidenceItems.length ? evidenceItems : undefined,
  };
}
