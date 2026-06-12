import {
  isBattleReportDetailPath,
  isMediaKitSubtreePath,
  resolveAssetsHrefAction,
  resolveAssetsRouteAction,
} from '@/src/lib/assets-hub-navigation';

describe('isMediaKitSubtreePath', () => {
  it('matches media kit routes and related assets pages', () => {
    expect(isMediaKitSubtreePath('/media-kit')).toBe(true);
    expect(isMediaKitSubtreePath('/media-kit-edit')).toBe(true);
    expect(isMediaKitSubtreePath('/media-kit-public')).toBe(true);
    expect(isMediaKitSubtreePath('/trust-passport')).toBe(true);
    expect(isMediaKitSubtreePath('/pricing')).toBe(true);
    expect(isMediaKitSubtreePath('/pricing-edit')).toBe(true);
    expect(isMediaKitSubtreePath('/settings/profile')).toBe(true);
    expect(isMediaKitSubtreePath('/battle-reports')).toBe(true);
    expect(isMediaKitSubtreePath('/battle-reports/br-01')).toBe(true);
    expect(isMediaKitSubtreePath('/proposal/sample')).toBe(true);
  });

  it('does not match external entry routes', () => {
    expect(isMediaKitSubtreePath('/account')).toBe(false);
    expect(isMediaKitSubtreePath('/inbox/thread-1')).toBe(false);
    expect(isMediaKitSubtreePath('/')).toBe(false);
  });
});

describe('resolveAssetsRouteAction', () => {
  it('returns dismissTo when returning to hub from a subtree page', () => {
    expect(resolveAssetsRouteAction('/media-kit-edit', 'openHub')).toBe('dismissTo');
    expect(resolveAssetsRouteAction('/pricing', 'openHub')).toBe('dismissTo');
  });

  it('returns push when opening hub from outside the subtree', () => {
    expect(resolveAssetsRouteAction('/account', 'openHub')).toBe('push');
    expect(resolveAssetsRouteAction('/inbox/thread-1', 'openHub')).toBe('push');
  });

  it('returns noop when already on hub', () => {
    expect(resolveAssetsRouteAction('/media-kit', 'openHub')).toBe('noop');
  });

  it('returns dismissTo for edit when already inside subtree', () => {
    expect(resolveAssetsRouteAction('/pricing', 'openEdit')).toBe('dismissTo');
  });

  it('always pushes forward into pricing', () => {
    expect(resolveAssetsRouteAction('/media-kit-edit', 'openPricing')).toBe('push');
  });

  it('returns dismissTo for battle report list from detail', () => {
    expect(isBattleReportDetailPath('/battle-reports/br-01')).toBe(true);
    expect(resolveAssetsRouteAction('/battle-reports/br-01', 'openBattleReportsList')).toBe('dismissTo');
  });
});

describe('resolveAssetsHrefAction', () => {
  it('maps media-kit href to hub intent', () => {
    expect(resolveAssetsHrefAction('/trust-passport', '/media-kit')).toBe('dismissTo');
    expect(resolveAssetsHrefAction('/account', '/media-kit')).toBe('push');
  });

  it('maps media-kit-edit href to edit intent', () => {
    expect(resolveAssetsHrefAction('/pricing', '/media-kit-edit')).toBe('dismissTo');
  });
});
