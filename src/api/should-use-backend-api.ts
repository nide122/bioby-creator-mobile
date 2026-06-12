import { isApiConfigured } from '@/src/api/api-config';
import { useSessionStore } from '@/src/stores/session-store';

/** True when HTTP calls should hit the Creator API (URL set and not in local demo workspace). */
export function shouldUseBackendApi(): boolean {
  if (!isApiConfigured()) return false;
  return !useSessionStore.getState().isLocalDemoWorkspace;
}
