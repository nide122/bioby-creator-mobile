import type { DraftDetail, DraftKind, DraftSummary } from '@/src/types/domain';

const DRAFT_KINDS: DraftKind[] = ['ai_reply', 'quote', 'follow_up'];

export type DraftListItemDto = {
  id: string;
  title: string;
  updatedAtISO: string;
  kind: string;
  requiresApproval: boolean;
  sourceBrandHint?: string | null;
  nextActionLabel?: string | null;
  approvalState?: string | null;
};

function asKind(value: string): DraftKind {
  return DRAFT_KINDS.includes(value as DraftKind) ? (value as DraftKind) : 'ai_reply';
}

function asApprovalState(value: string | null | undefined): 'pending' | 'approved' | undefined {
  if (value === 'approved') return 'approved';
  if (value === 'pending') return 'pending';
  return undefined;
}

export function mapDraftSummary(dto: DraftListItemDto): DraftSummary {
  return {
    id: dto.id,
    title: dto.title,
    updatedAtISO: dto.updatedAtISO,
    kind: asKind(dto.kind),
    requiresApproval: dto.requiresApproval,
    sourceBrandHint: dto.sourceBrandHint ?? undefined,
    nextActionLabel: dto.nextActionLabel ?? undefined,
    approvalState: asApprovalState(dto.approvalState),
  };
}

export type DraftDetailDto = DraftListItemDto & {
  approvedAtISO?: string | null;
  body: string;
  sourceThreadId?: string | null;
  linkedDealId?: string | null;
};

export function mapDraftDetail(dto: DraftDetailDto): DraftDetail {
  return {
    ...mapDraftSummary(dto),
    body: dto.body,
    sourceThreadId: dto.sourceThreadId ?? undefined,
    approvedAtISO: dto.approvedAtISO ?? undefined,
    linkedDealId: dto.linkedDealId ?? undefined,
  };
}
