import { resolveDealPaymentStatus } from '@/src/lib/deal-payment-status';
import type { DealSummary } from '@/src/types/domain';

const t = (key: string) => {
  const table: Record<string, string> = {
    'dealsScreen.paymentStatus.awaiting_prepay': '待预付',
    'dealCopy.paymentStatus.prepayPending': '待收预付款',
  };
  return table[key] ?? key;
};

describe('deal-payment-status', () => {
  it('prefers localized API payment status label', () => {
    const deal: Pick<DealSummary, 'escrowPhase' | 'paymentStatusLabel'> = {
      escrowPhase: 'awaiting_prepay',
      paymentStatusLabel: 'Prepay pending',
    };
    expect(resolveDealPaymentStatus(deal, t)).toBe('待收预付款');
  });

  it('falls back to phase mapping when API label is absent', () => {
    const deal: Pick<DealSummary, 'escrowPhase' | 'paymentStatusLabel'> = {
      escrowPhase: 'awaiting_prepay',
    };
    expect(resolveDealPaymentStatus(deal, t)).toBe('待预付');
  });
});
