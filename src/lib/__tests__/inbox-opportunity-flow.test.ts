import { dealLifecycleStepStates } from '@/src/lib/inbox-opportunity-flow';

describe('inbox-opportunity-flow', () => {
  it('tracks deal lifecycle phases', () => {
    expect(dealLifecycleStepStates('awaiting_prepay').prepay).toBe('current');
    expect(dealLifecycleStepStates('pending_verification').verification).toBe('current');
    expect(dealLifecycleStepStates('settled').settled).toBe('done');
  });
});
