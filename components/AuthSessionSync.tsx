import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { onSessionExpired } from '@/src/auth/auth-session-events';
import { alertAction } from '@/src/lib/app-dialog';
import { useSessionStore } from '@/src/stores/session-store';

/** Clears local auth state and cache when the API reports an expired session. */
export function AuthSessionSync() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const clearLocalSession = useSessionStore((s) => s.clearLocalSession);

  useEffect(() => {
    return onSessionExpired(() => {
      const wasAuthenticated = useSessionStore.getState().isAuthenticated;
      clearLocalSession();
      queryClient.clear();
      if (wasAuthenticated) {
        void alertAction(t('auth.sessionExpired.title'), t('auth.sessionExpired.message'));
      }
    });
  }, [clearLocalSession, queryClient, t]);

  return null;
}
