import { queryClient } from '@/src/lib/query-client';
import { usePublicDemoStore } from '@/src/demo/public-demo-store';
import { isPublicDemoEnabled } from '@/src/demo/public-demo-config';
import { useSessionStore } from '@/src/stores/session-store';

/** Enter the public sandbox without creating an account or clearing a real JWT. */
export async function enterPublicDemo(): Promise<boolean> {
  if (!isPublicDemoEnabled()) return false;
  queryClient.clear();
  usePublicDemoStore.getState().reset();
  useSessionStore.getState().enterPublicDemo();
  return true;
}

/** Leave only the public sandbox; real token storage is deliberately untouched. */
export async function exitPublicDemo(): Promise<void> {
  queryClient.clear();
  usePublicDemoStore.getState().reset();
  useSessionStore.getState().clearLocalSession();
  if (usePublicDemoStore.persist) {
    await usePublicDemoStore.persist.clearStorage();
  }
}

export async function simulatePublicDemoMailboxSync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  usePublicDemoStore.getState().completeSimulatedMailboxSync();
}

