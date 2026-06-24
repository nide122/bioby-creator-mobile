import { shouldShowInboxRateCardBanner } from '@/src/lib/inbox-rate-card-banner';

describe('shouldShowInboxRateCardBanner', () => {
  it('hides while rate card query is pending', () => {
    expect(shouldShowInboxRateCardBanner({ isPending: true, packageCount: 0 })).toBe(false);
  });

  it('shows when there are no packages', () => {
    expect(shouldShowInboxRateCardBanner({ isPending: false, packageCount: 0 })).toBe(true);
  });

  it('hides when at least one package exists', () => {
    expect(shouldShowInboxRateCardBanner({ isPending: false, packageCount: 1 })).toBe(false);
  });
});
