import type { TFunction } from 'i18next';

import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';

const PAYMENT_STATUS: Record<string, string> = {
  'Prepay pending': 'prepayPending',
  'Awaiting prepay': 'prepayPending',
  'Funds in escrow': 'fundsInEscrow',
  'In production': 'inProduction',
  'Awaiting release': 'awaitingRelease',
  'Paid out': 'paidOut',
  'Remediation hold': 'remediationHold',
  'Dispute hold': 'disputeHold',
};

export function localizePaymentStatusLabel(text: string | undefined, t: TFunction): string | undefined {
  if (!text?.trim()) return text;
  const key = PAYMENT_STATUS[text.trim()];
  return key ? t(`dealCopy.paymentStatus.${key}`) : text;
}

export function resolveDealPaymentStatus(
  deal: Pick<DealSummary, 'escrowPhase' | 'paymentStatusLabel'>,
  t: TFunction
): string {
  if (deal.paymentStatusLabel?.trim()) {
    return localizePaymentStatusLabel(deal.paymentStatusLabel, t) ?? deal.paymentStatusLabel;
  }
  return t(`dealsScreen.paymentStatus.${deal.escrowPhase}`);
}

export function paymentStatusForPhase(phase: EscrowLifecyclePhase, t: TFunction): string {
  return t(`dealsScreen.paymentStatus.${phase}`);
}
