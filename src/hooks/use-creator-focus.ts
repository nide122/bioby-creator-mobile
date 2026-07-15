import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { updateTenantSettings } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import appI18n from '@/src/i18n';
import { alertAction } from '@/src/lib/app-dialog';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import type { CreatorFocusMode } from '@/src/stores/session-store';
import { useSessionStore } from '@/src/stores/session-store';

export function useCreatorFocusMode() {
  const creatorFocusMode = useSessionStore((s) => s.creatorFocusMode);
  const setLocal = useSessionStore((s) => s.setCreatorFocusMode);
  const queryClient = useQueryClient();
  const [isUpdatingFocusMode, setIsUpdatingFocusMode] = useState(false);

  const setCreatorFocusMode = useCallback(
    (mode: CreatorFocusMode) => {
      if (mode === creatorFocusMode || isUpdatingFocusMode) {
        return;
      }

      const previous = creatorFocusMode;
      setLocal(mode);

      if (!shouldUseBackendApi()) {
        return;
      }

      setIsUpdatingFocusMode(true);
      void (async () => {
        try {
          await updateTenantSettings({ creatorFocusMode: mode });
          await invalidateTenantScopedQueries(queryClient);
        } catch (err: unknown) {
          setLocal(previous);
          const message =
            err instanceof Error ? err.message : appI18n.t('account.focusSaveErrorFallback');
          await alertAction(appI18n.t('account.focusSaveErrorTitle'), message);
        } finally {
          setIsUpdatingFocusMode(false);
        }
      })();
    },
    [creatorFocusMode, isUpdatingFocusMode, queryClient, setLocal],
  );

  return { creatorFocusMode, setCreatorFocusMode, isUpdatingFocusMode };
}
