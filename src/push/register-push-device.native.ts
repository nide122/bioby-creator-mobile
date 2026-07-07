import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { isApiConfigured } from '@/src/api/api-config';
import { registerPushDevice, unregisterPushDevice } from '@/src/api/push-api';

type NotificationsModule = typeof import('expo-notifications');

let lastRegisteredToken: string | null = null;
let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGo()) {
    return null;
  }
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }
  try {
    notificationsModule = await import('expo-notifications');
    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerConfigured = true;
    }
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

function resolveEasProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const projectId = extra?.eas?.projectId;
  if (projectId && projectId !== '00000000-0000-0000-0000-000000000000') {
    return projectId;
  }
  return undefined;
}

export async function ensurePushDeviceRegistered(locale: string): Promise<void> {
  if (!isApiConfigured()) {
    return;
  }
  if (!Device.isDevice) {
    return;
  }

  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return;
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = resolveEasProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const expoPushToken = tokenResponse.data;
  if (!expoPushToken || expoPushToken === lastRegisteredToken) {
    return;
  }

  await registerPushDevice({
    expoPushToken,
    platform: Platform.OS,
    locale: locale.startsWith('zh') ? 'zh' : 'en',
  });
  lastRegisteredToken = expoPushToken;
}

export async function revokeRegisteredPushDevice(): Promise<void> {
  if (!lastRegisteredToken || !isApiConfigured()) {
    lastRegisteredToken = null;
    return;
  }
  try {
    await unregisterPushDevice(lastRegisteredToken);
  } catch {
    // Best-effort on logout.
  } finally {
    lastRegisteredToken = null;
  }
}

export function getLastRegisteredPushToken(): string | null {
  return lastRegisteredToken;
}
