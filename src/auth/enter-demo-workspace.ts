import { isApiConfigured } from '@/src/api/api-config';
import { clearAuthTokens } from '@/src/auth/token-storage';
import { useSessionStore } from '@/src/stores/session-store';

/** Dev shortcut: seed local demo workspace; clear stale JWT when API URL is configured. */
export async function enterDemoWorkspace(): Promise<void> {
  if (isApiConfigured()) {
    await clearAuthTokens();
  }
  useSessionStore.getState().jumpToWorkspaceDemo();
}
