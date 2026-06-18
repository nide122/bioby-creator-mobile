import { dealQuickLinkIdsForPhase } from '@/src/lib/deal-quick-links';

describe('deal-quick-links', () => {
  it('hides completed workflow links for the current phase', () => {
    expect(dealQuickLinkIdsForPhase('awaiting_prepay')).toEqual(['packet', 'payments']);
    expect(dealQuickLinkIdsForPhase('in_execution')).toEqual(['delivery', 'payments']);
    expect(dealQuickLinkIdsForPhase('pending_verification')).toEqual(['verification', 'payments']);
    expect(dealQuickLinkIdsForPhase('settled')).toEqual(['payments']);
  });
});
