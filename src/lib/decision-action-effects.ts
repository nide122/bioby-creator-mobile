import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { approveDealVerification } from '@/src/api/deals-api';
import type { DecisionAction } from '@/src/types/domain';

export type DecisionActionEffectResult = {
  handled: boolean;
  dealId?: string;
};

/** Runs server side-effects for Today decision primary actions (e.g. brand approve & release). */
export async function runDecisionActionEffect(action: DecisionAction): Promise<DecisionActionEffectResult> {
  if (!shouldUseBackendApi() || action.id !== 'approve' || !action.href) {
    return { handled: false };
  }
  const match = action.href.match(/^\/deal\/(\d+)\/verification$/);
  if (!match) {
    return { handled: false };
  }
  await approveDealVerification(match[1]);
  return { handled: true, dealId: match[1] };
}
