import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { updateTenantSettings } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import appI18n from '@/src/i18n';
import { alertAction } from '@/src/lib/app-dialog';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import type { ClassificationStrictness } from '@/src/stores/session-store';
import { useSessionStore } from '@/src/stores/session-store';

export function useClassificationStrictness() {
  const queryClient = useQueryClient();
  const classificationStrictness = useSessionStore((s) => s.classificationStrictness);
  const setLocal = useSessionStore((s) => s.setClassificationStrictness);
  const setInboxReclassificationActive = useSessionStore((s) => s.setInboxReclassificationActive);
  const [isUpdatingStrictness, setIsUpdatingStrictness] = useState(false);

  const setClassificationStrictness = useCallback(
    (strictness: ClassificationStrictness) => {
      if (strictness === classificationStrictness || isUpdatingStrictness) {
        return;
      }

      const previous = classificationStrictness;
      setLocal(strictness);

      if (!shouldUseBackendApi()) {
        return;
      }

      setIsUpdatingStrictness(true);
      setInboxReclassificationActive(true);
      void (async () => {
        try {
          await updateTenantSettings({ classificationStrictness: strictness });
          await invalidateTenantScopedQueries(queryClient);
        } catch (err: unknown) {
          setLocal(previous);
          const message =
            err instanceof Error ? err.message : appI18n.t('onboardingSync.inboxFilterFallback');
          await alertAction(appI18n.t('onboardingSync.inboxFilterTitle'), message);
        } finally {
          setIsUpdatingStrictness(false);
          setInboxReclassificationActive(false);
        }
      })();
    },
    [
      classificationStrictness,
      isUpdatingStrictness,
      queryClient,
      setInboxReclassificationActive,
      setLocal,
    ],
  );

  return { classificationStrictness, setClassificationStrictness, isUpdatingStrictness };
}
