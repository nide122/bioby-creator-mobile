import { apiRequest } from '@/src/api/api-client';

export type PushDeviceView = {
  id: number;
  expoPushToken: string;
  platform: string;
  locale: string;
  enabled: boolean;
  lastSeenAt: string;
};

export async function registerPushDevice(input: {
  expoPushToken: string;
  platform: string;
  locale: string;
}): Promise<PushDeviceView> {
  return apiRequest<PushDeviceView>('/api/v1/push-devices', {
    method: 'PUT',
    body: input,
  });
}

export async function unregisterPushDevice(expoPushToken: string): Promise<void> {
  await apiRequest<void>('/api/v1/push-devices', {
    method: 'DELETE',
    body: { expoPushToken },
  });
}

export async function listMyPushDevices(): Promise<PushDeviceView[]> {
  return apiRequest<PushDeviceView[]>('/api/v1/push-devices/me');
}
