/** Helpers for inbox brief → deal confirmation eligibility (Phase 1). */
import type { InboxLeadStage, InboxRiskFlag, InboxThreadDetail } from '@/src/types/domain';

const QUOTED_OR_LATER: InboxLeadStage[] = ['quoted', 'negotiating'];

export function isLeadStageQuotedOrLater(stage: InboxLeadStage): boolean {
  return QUOTED_OR_LATER.includes(stage);
}

export function hasUnacknowledgedDangerFlags(flags: InboxRiskFlag[]): boolean {
  return flags.some((flag) => flag.severity === 'danger' && !flag.acknowledged);
}

export function unacknowledgedDangerFlags(flags: InboxRiskFlag[]): InboxRiskFlag[] {
  return flags.filter((flag) => flag.severity === 'danger' && !flag.acknowledged);
}

export function isBriefConfirmed(detail: Pick<InboxThreadDetail, 'briefStage' | 'dealId'>): boolean {
  return detail.briefStage === 'CONFIRMED' || !!detail.dealId;
}

/** User may tap confirm — danger acknowledgement happens in that step if needed. */
export function canProceedToConfirmBrief(
  detail: Pick<InboxThreadDetail, 'extractionStatus' | 'briefStage' | 'dealId' | 'leadStage'>
): boolean {
  if (isBriefConfirmed(detail)) {
    return false;
  }
  if (detail.extractionStatus !== 'COMPLETE') {
    return false;
  }
  return isLeadStageQuotedOrLater(detail.leadStage);
}

export function canConfirmBrief(
  detail: Pick<
    InboxThreadDetail,
    'extractionStatus' | 'briefStage' | 'dealId' | 'leadStage' | 'riskFlags'
  >
): boolean {
  if (isBriefConfirmed(detail)) {
    return false;
  }
  if (detail.extractionStatus !== 'COMPLETE') {
    return false;
  }
  if (!isLeadStageQuotedOrLater(detail.leadStage)) {
    return false;
  }
  return !hasUnacknowledgedDangerFlags(detail.riskFlags);
}

export type BriefConfirmBlocker =
  | 'brief_pending'
  | 'lead_stage_early'
  | 'lead_stage_draft_ready'
  | 'danger_risks'
  | 'already_confirmed';

export function briefConfirmBlocker(
  detail: Pick<
    InboxThreadDetail,
    'extractionStatus' | 'briefStage' | 'dealId' | 'leadStage' | 'riskFlags'
  >
): BriefConfirmBlocker | null {
  if (isBriefConfirmed(detail)) {
    return 'already_confirmed';
  }
  if (detail.extractionStatus !== 'COMPLETE') {
    return 'brief_pending';
  }
  if (!isLeadStageQuotedOrLater(detail.leadStage)) {
    return detail.leadStage === 'draft_ready' ? 'lead_stage_draft_ready' : 'lead_stage_early';
  }
  if (hasUnacknowledgedDangerFlags(detail.riskFlags)) {
    return 'danger_risks';
  }
  return null;
}
