import {
  alertAction,
  confirmAction,
  registerAppDialog,
  unregisterAppDialog,
} from '@/src/lib/app-dialog';

describe('app-dialog', () => {
  afterEach(() => {
    unregisterAppDialog();
  });

  it('confirmAction resolves through the registered presenter', async () => {
    registerAppDialog({
      confirm: async () => true,
      alert: async () => undefined,
    });
    await expect(confirmAction({
      title: 'Title',
      message: 'Message',
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
    })).resolves.toBe(true);
  });

  it('alertAction resolves through the registered presenter', async () => {
    const alert = jest.fn().mockResolvedValue(undefined);
    registerAppDialog({
      confirm: async () => false,
      alert,
    });
    await alertAction('Title', 'Message');
    expect(alert).toHaveBeenCalledWith({
      title: 'Title',
      message: 'Message',
      dismissLabel: expect.any(String),
    });
  });

  it('returns safe fallbacks when no presenter is mounted', async () => {
    await expect(confirmAction({
      title: 'Title',
      message: 'Message',
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
    })).resolves.toBe(false);
    await expect(alertAction('Title', 'Message')).resolves.toBeUndefined();
  });
});
