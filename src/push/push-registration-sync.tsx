import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { isApiConfigured } from '@/src/api/api-config';
import { useAuthSessionReady } from '@/src/hooks/use-auth-session-ready';
import { ensurePushDeviceRegistered } from '@/src/push/register-push-device';
import { useSessionStore } from '@/src/stores/session-store';

/** Registers Expo push token after auth bootstrap (native only; web is skipped). */
export function PushRegistrationSync() {
  const ready = useAuthSessionReady();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isLocalDemoWorkspace = useSessionStore((s) => s.isLocalDemoWorkspace);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!ready || !isAuthenticated || isLocalDemoWorkspace || !isApiConfigured()) {
      return;
    }
    void ensurePushDeviceRegistered(i18n.language).catch(() => {
      // Permission denied or missing EAS project — non-fatal.
    });
  }, [ready, isAuthenticated, isLocalDemoWorkspace, i18n.language]);

  return null;
}
