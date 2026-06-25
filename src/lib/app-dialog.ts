import { Alert } from 'react-native';

import appI18n from '@/src/i18n';

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
};

export type AlertDialogOptions = {
  title: string;
  message: string;
  dismissLabel?: string;
};

type DialogPresenter = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
};

let presenter: DialogPresenter | null = null;

export function registerAppDialog(next: DialogPresenter) {
  presenter = next;
}

export function unregisterAppDialog() {
  presenter = null;
}

export function confirmAction(options: ConfirmDialogOptions): Promise<boolean> {
  if (presenter) return presenter.confirm(options);
  return Promise.resolve(false);
}

export function alertAction(title: string, message: string, dismissLabel?: string): Promise<void> {
  const dismiss = dismissLabel ?? appI18n.t('common.ok');
  if (presenter) {
    return presenter.alert({ title, message, dismissLabel: dismiss });
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: dismiss, onPress: () => resolve() }]);
  });
}
