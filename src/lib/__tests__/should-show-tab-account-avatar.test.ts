import { shouldShowTabAccountAvatar } from '@/src/lib/should-show-tab-account-avatar';

describe('shouldShowTabAccountAvatar', () => {
  it('always hides the legacy floating avatar overlay', () => {
    expect(shouldShowTabAccountAvatar(['(tabs)'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'index'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'inbox'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'deals'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'account'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'inbox', 'thread-1'])).toBe(false);
  });
});
