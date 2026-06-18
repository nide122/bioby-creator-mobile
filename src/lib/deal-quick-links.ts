import type { EscrowLifecyclePhase } from '@/src/types/domain';

export type DealQuickLinkId = 'packet' | 'delivery' | 'verification' | 'payments';

/** Hide workflow quick links that are already complete for the current escrow phase. */
export function dealQuickLinkIdsForPhase(phase: EscrowLifecyclePhase): DealQuickLinkId[] {
  switch (phase) {
    case 'awaiting_prepay':
      return ['packet', 'payments'];
    case 'escrowed':
    case 'in_execution':
      return ['delivery', 'payments'];
    case 'pending_verification':
      return ['verification', 'payments'];
    case 'remediation':
    case 'disputed':
      return ['delivery', 'packet', 'payments'];
    case 'settled':
      return ['payments'];
    default:
      return ['packet', 'payments'];
  }
}
