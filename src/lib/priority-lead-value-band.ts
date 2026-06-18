import { isOpportunityPathClosed } from '@/src/lib/opportunity-path-step';
import type { EscrowLifecyclePhase, InboxThread, LeadValueBand, OpportunityPipelinePhase } from '@/src/types/domain';

/** Active escrow / delivery — shown in the follow-up priority bucket. */
export const ACTIVE_ESCROW_DELIVERY_PHASES: EscrowLifecyclePhase[] = [
  'awaiting_prepay',
  'escrowed',
  'in_execution',
  'pending_verification',
  'remediation',
  'disputed',
];

export const ACTIVE_DEAL_PIPELINE_PHASES: OpportunityPipelinePhase[] = [
  'CONTRACTED',
  'PRODUCTION',
  'BRAND_REVIEW',
  'REVISION',
];

export type PriorityBandInput = Pick<
  InboxThread,
  'leadValueBand' | 'pipelinePhase' | 'dealEscrowPhase' | 'dealId'
>;

export function isActiveEscrowDelivery(item: PriorityBandInput): boolean {
  if (isOpportunityPathClosed(item)) {
    return false;
  }
  if (item.dealEscrowPhase && ACTIVE_ESCROW_DELIVERY_PHASES.includes(item.dealEscrowPhase)) {
    return true;
  }
  if (item.pipelinePhase && ACTIVE_DEAL_PIPELINE_PHASES.includes(item.pipelinePhase)) {
    return true;
  }
  return false;
}

/** Priority inbox bucket — escrow delivery always maps to the follow-up band. */
export function resolvePriorityLeadValueBand(item: PriorityBandInput): LeadValueBand | undefined {
  if (isOpportunityPathClosed(item)) {
    return undefined;
  }
  if (isActiveEscrowDelivery(item)) {
    return 'needs_negotiation';
  }
  if (item.leadValueBand === 'high_value' || item.leadValueBand === 'needs_negotiation') {
    return item.leadValueBand;
  }
  return undefined;
}

export function countPriorityLeadValueBands(
  items: PriorityBandInput[]
): Record<'high_value' | 'needs_negotiation', number> {
  const counts = { high_value: 0, needs_negotiation: 0 };
  for (const item of items) {
    const band = resolvePriorityLeadValueBand(item);
    if (band === 'high_value' || band === 'needs_negotiation') {
      counts[band] += 1;
    }
  }
  return counts;
}
