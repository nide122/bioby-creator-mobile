import {
  isTabRootReturnTarget,
  navigateReturnTo,
  resolveReturnTarget,
} from '../open-brand-detail';

describe('isTabRootReturnTarget', () => {
  it('treats Today and other tab roots as tab targets', () => {
    expect(isTabRootReturnTarget('/')).toBe(true);
    expect(isTabRootReturnTarget('/inbox')).toBe(true);
    expect(isTabRootReturnTarget('/deals')).toBe(true);
    expect(isTabRootReturnTarget('/account')).toBe(true);
    expect(isTabRootReturnTarget('/(tabs)/index')).toBe(true);
  });

  it('rejects nested and non-tab routes', () => {
    expect(isTabRootReturnTarget('/inbox/42')).toBe(false);
    expect(isTabRootReturnTarget('/brand/5')).toBe(false);
    expect(isTabRootReturnTarget('/deal/9')).toBe(false);
  });
});

describe('navigateReturnTo', () => {
  it('uses navigate for Today instead of dismissTo', () => {
    const router = {
      navigate: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
      canDismiss: jest.fn(() => true),
    };

    navigateReturnTo(router, '/');

    expect(router.navigate).toHaveBeenCalledWith('/');
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('resets inbox stack before returning to Today from a thread', () => {
    const router = {
      navigate: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
      canDismiss: jest.fn(() => true),
    };

    navigateReturnTo(router, '/', null, '/inbox/42');

    expect(router.replace).toHaveBeenCalledWith('/inbox');
    expect(router.navigate).toHaveBeenCalledWith('/');
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('still resets inbox with replace when dismiss is available', () => {
    const router = {
      navigate: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
      canDismiss: jest.fn(() => false),
    };

    navigateReturnTo(router, '/', null, '/inbox/message/81');

    expect(router.replace).toHaveBeenCalledWith('/inbox');
    expect(router.navigate).toHaveBeenCalledWith('/');
  });

  it('uses navigate for inbox tab root even when canDismiss is true', () => {
    const router = {
      navigate: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
      canDismiss: jest.fn(() => true),
    };

    navigateReturnTo(router, '/inbox');

    expect(router.navigate).toHaveBeenCalledWith('/inbox');
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('still dismisses to non-tab targets when possible', () => {
    const router = {
      navigate: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
      canDismiss: jest.fn(() => true),
    };

    navigateReturnTo(router, '/brand/5');

    expect(router.dismissTo).toHaveBeenCalledWith('/brand/5');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('replaces non-tab targets when dismiss is unavailable', () => {
    const router = {
      navigate: jest.fn(),
      replace: jest.fn(),
      dismissTo: jest.fn(),
      canDismiss: jest.fn(() => false),
    };

    navigateReturnTo(router, '/brand/5');

    expect(router.replace).toHaveBeenCalledWith('/brand/5');
  });
});

describe('resolveReturnTarget', () => {
  it('returns plain paths unchanged', () => {
    expect(resolveReturnTarget('/')).toBe('/');
    expect(resolveReturnTarget('/inbox')).toBe('/inbox');
  });
});
