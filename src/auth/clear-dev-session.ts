import { Platform } from 'react-native';

import { isApiConfigured } from '@/src/api/api-config';
import { logoutAccount } from '@/src/api/auth-api';
import { clearAuthTokens } from '@/src/auth/token-storage';
import { useSessionStore } from '@/src/stores/session-store';

/** Dev-only: wipe JWT, zustand session, and web persist storage. */
export async function clearDevSession(): Promise<void> {
  if (isApiConfigured()) {
    try {
      await logoutAccount();
    } catch {
      await clearAuthTokens();
    }
  } else {
    await clearAuthTokens();
  }

  useSessionStore.getState().clearLocalSession();

  if (Platform.OS === 'web' && __DEV__ && useSessionStore.persist?.clearStorage) {
    await useSessionStore.persist.clearStorage();
  }
}
