import { isActiveEscrowDelivery } from '@/src/lib/priority-lead-value-band';
import { isOpportunityPathClosed } from '@/src/lib/opportunity-path-step';
import type { InboxThread } from '@/src/types/domain';

export function isOpportunityNeedsAction(
  item: Pick<InboxThread, 'leadValueBand' | 'actionTier' | 'pipelinePhase' | 'dealEscrowPhase' | 'dealId'>
): boolean {
  if (isOpportunityPathClosed(item)) {
    return false;
  }
  if (isActiveEscrowDelivery(item)) {
    return true;
  }
  if (item.leadValueBand) {
    return item.leadValueBand !== 'archived';
  }
  return ['DECIDE_NOW', 'DEVELOP'].includes(item.actionTier ?? '');
}
