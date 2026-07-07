import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';

type PushData = {
  type?: string;
  route?: string;
};

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function resolveRoute(data: PushData | undefined): string | null {
  if (!data?.route || typeof data.route !== 'string') {
    return null;
  }
  if (data.route === '/' || data.route === '/inbox') {
    return data.route;
  }
  if (data.route.startsWith('/')) {
    return data.route;
  }
  return null;
}

function navigateFromNotification(data: PushData | undefined): void {
  const route = resolveRoute(data);
  if (!route) {
    if (data?.type === 'NEW_DECISIONS') {
      router.push('/' as never);
      return;
    }
    if (data?.type === 'SYNC_COMPLETE') {
      router.push('/inbox' as never);
      return;
    }
    return;
  }
  router.push(route as never);
}

export function PushNotificationHandler() {
  useEffect(() => {
    if (isExpoGo()) {
      return;
    }

    let subscription: { remove: () => void } | undefined;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as PushData | undefined;
          navigateFromNotification(data);
        });

        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          const data = response.notification.request.content.data as PushData | undefined;
          navigateFromNotification(data);
        }
      } catch {
        // Unsupported in Expo Go or missing native module.
      }
    })();

    return () => subscription?.remove();
  }, []);

  return null;
}
