import type { FlowStep, FlowStepState } from '@/components/product/FlowSteps';
import type { EscrowLifecyclePhase } from '@/src/types/domain';

export type DealLifecycleStepId = 'prepay' | 'delivery' | 'verification' | 'settled';

export function dealLifecycleStepStates(phase: EscrowLifecyclePhase): Record<DealLifecycleStepId, FlowStepState> {
  switch (phase) {
    case 'awaiting_prepay':
      return { prepay: 'current', delivery: 'upcoming', verification: 'upcoming', settled: 'upcoming' };
    case 'escrowed':
    case 'in_execution':
      return { prepay: 'done', delivery: 'current', verification: 'upcoming', settled: 'upcoming' };
    case 'pending_verification':
      return { prepay: 'done', delivery: 'done', verification: 'current', settled: 'upcoming' };
    case 'settled':
      return { prepay: 'done', delivery: 'done', verification: 'done', settled: 'done' };
    case 'remediation':
    case 'disputed':
      return { prepay: 'done', delivery: 'current', verification: 'upcoming', settled: 'upcoming' };
    default:
      return { prepay: 'upcoming', delivery: 'upcoming', verification: 'upcoming', settled: 'upcoming' };
  }
}

export function buildFlowSteps(
  defs: { id: string; label: string; hint?: string }[],
  states: Record<string, FlowStepState>
): FlowStep[] {
  return defs.map((def) => ({
    ...def,
    state: states[def.id] ?? 'upcoming',
  }));
}
