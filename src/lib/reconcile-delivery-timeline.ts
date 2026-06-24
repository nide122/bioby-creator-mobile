import type { DealDeliveryStep } from '@/src/types/deal-workflow';
import type { EscrowLifecyclePhase } from '@/src/types/domain';

/** Client-side mirror of backend timeline sync so stale packet rows still render correctly. */
export function reconcileDeliveryTimeline(
  steps: DealDeliveryStep[],
  escrowPhase: EscrowLifecyclePhase,
): DealDeliveryStep[] {
  if (steps.length === 0) return steps;

  switch (escrowPhase) {
    case 'settled':
    case 'pending_verification':
      return steps.map((step) => ({ ...step, status: 'done' }));
    case 'in_execution':
      return steps.map((step) => {
        if (step.id === 'rough-cut') return { ...step, status: 'current' };
        if (step.id === 'final' || step.id === 'live' || step.id === 'release') {
          return { ...step, status: 'upcoming' };
        }
        return { ...step, status: 'done' };
      });
    case 'escrowed':
      return steps.map((step) => {
        if (step.id === 'kickoff' || step.id === 'script') return { ...step, status: 'current' };
        if (step.id === 'brief') return { ...step, status: 'done' };
        return { ...step, status: 'upcoming' };
      });
    case 'awaiting_prepay':
      return steps.map((step) =>
        step.id === 'brief' ? { ...step, status: 'done' } : { ...step, status: 'upcoming' },
      );
    default:
      return steps;
  }
}
