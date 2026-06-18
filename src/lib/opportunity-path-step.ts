import { isBriefConfirmed } from '@/src/lib/brief-confirm-eligibility';
import type { EscrowLifecyclePhase, InboxLeadStage, InboxThreadDetail } from '@/src/types/domain';

export type OpportunityPathStep = 'inbox' | 'draft' | 'deal' | 'completed';

export type OpportunityPathInput = Pick<
  InboxThreadDetail,
  'briefStage' | 'dealId' | 'leadStage' | 'pipelinePhase' | 'dealEscrowPhase'
>;

const QUOTE_PATH_STAGES: InboxLeadStage[] = ['draft_ready', 'quoted', 'negotiating'];

export function resolveOpportunityPathStep(detail: OpportunityPathInput): OpportunityPathStep {
  if (detail.pipelinePhase === 'CLOSED' || detail.dealEscrowPhase === 'settled') {
    return 'completed';
  }
  if (isBriefConfirmed(detail)) {
    return 'deal';
  }
  if (QUOTE_PATH_STAGES.includes(detail.leadStage)) {
    return 'draft';
  }
  return 'inbox';
}

export function isOpportunityPathClosed(
  detail: Pick<InboxThreadDetail, 'pipelinePhase' | 'dealEscrowPhase'>
): boolean {
  return detail.pipelinePhase === 'CLOSED' || detail.dealEscrowPhase === 'settled';
}

export function mergeDealEscrowPhase(
  detail: Pick<InboxThreadDetail, 'dealEscrowPhase'>,
  dealEscrowPhase?: EscrowLifecyclePhase
): EscrowLifecyclePhase | undefined {
  return detail.dealEscrowPhase ?? dealEscrowPhase;
}
