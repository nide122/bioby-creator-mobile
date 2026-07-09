import { shouldShowTabAccountAvatar } from '@/src/lib/should-show-tab-account-avatar';

describe('shouldShowTabAccountAvatar', () => {
  it('shows on main tab hubs', () => {
    expect(shouldShowTabAccountAvatar(['(tabs)'])).toBe(true);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'index'])).toBe(true);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'inbox'])).toBe(true);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'deals'])).toBe(true);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'growth'])).toBe(true);
  });

  it('hides on account and nested stacks', () => {
    expect(shouldShowTabAccountAvatar(['(tabs)', 'account'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'inbox', 'thread-1'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['(tabs)', 'inbox', 'manual'])).toBe(false);
    expect(shouldShowTabAccountAvatar(['settings', 'team'])).toBe(false);
  });
});
