import { useCallback } from 'react';

import { updateTenantSettings } from '@/src/api/account-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { CreatorFocusMode } from '@/src/stores/session-store';
import { useSessionStore } from '@/src/stores/session-store';

export function useCreatorFocusMode() {
  const creatorFocusMode = useSessionStore((s) => s.creatorFocusMode);
  const setLocal = useSessionStore((s) => s.setCreatorFocusMode);

  const setCreatorFocusMode = useCallback(
    (mode: CreatorFocusMode) => {
      setLocal(mode);
      if (shouldUseBackendApi()) {
        void updateTenantSettings({ creatorFocusMode: mode });
      }
    },
    [setLocal]
  );

  return { creatorFocusMode, setCreatorFocusMode };
}
