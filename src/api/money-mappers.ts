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

export type PaymentLineDto = {
  id: string;
  dealId?: string | null;
  label: string;
  amountCents: number;
  currency: string;
  phase: string;
  dealTitle?: string | null;
  nextStepHint?: string | null;
  expectedReleaseLabel?: string | null;
};

export type PaymentsOverviewDto = {
  currency: string;
  inEscrowCents: number;
  pendingVerificationCents: number;
  awaitingSettlementCents: number;
  footnote: string;
};

export type DisputeCaseDto = {
  id: string;
  dealId?: string | null;
  title: string;
  state: string;
  causeCode?: string | null;
  slaHint?: string | null;
  nextActionLabel?: string | null;
  evidenceItems?: unknown;
};

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

export function mapPaymentLine(dto: PaymentLineDto): PaymentLineItem {
  return {
    id: dto.id,
    dealId: dto.dealId ?? undefined,
    label: dto.label,
    amountCents: dto.amountCents,
    currency: dto.currency === 'CNY' ? 'CNY' : 'USD',
    phase: asPhase(dto.phase),
    dealTitle: dto.dealTitle ?? undefined,
    nextStepHint: dto.nextStepHint ?? undefined,
    expectedReleaseLabel: dto.expectedReleaseLabel ?? undefined,
  };
}

export function mapPaymentsOverview(dto: PaymentsOverviewDto): PaymentsOverview {
  return {
    currency: dto.currency === 'CNY' ? 'CNY' : 'USD',
    inEscrowCents: dto.inEscrowCents,
    pendingVerificationCents: dto.pendingVerificationCents,
    awaitingSettlementCents: dto.awaitingSettlementCents,
    footnote: dto.footnote,
  };
}

export function mapDisputeCase(dto: DisputeCaseDto): DisputeCase {
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
    id: dto.id,
    dealId: dto.dealId ?? undefined,
    title: dto.title,
    state,
    causeCode: dto.causeCode ?? undefined,
    slaHint: dto.slaHint ?? undefined,
    nextActionLabel: dto.nextActionLabel ?? undefined,
    evidenceItems: evidenceItems.length ? evidenceItems : undefined,
  };
}
