/** Default + web: skip Expo push token registration (#129 Phase E). Native uses `.native.ts`. */

export async function ensurePushDeviceRegistered(_locale: string): Promise<void> {
  return;
}

export async function revokeRegisteredPushDevice(): Promise<void> {
  return;
}

export function getLastRegisteredPushToken(): string | null {
  return null;
}
