import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useSessionStore } from '@/src/stores/session-store';

/** Wait for web sessionStorage rehydrate before route guard runs. */
export function useSessionHydrated(): boolean {
  const persistApi = useSessionStore.persist;
  const needsHydration = Platform.OS === 'web' && persistApi != null;
  const [hydrated, setHydrated] = useState(() => !needsHydration || persistApi.hasHydrated());

  useEffect(() => {
    if (!needsHydration) return;
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = persistApi.onFinishHydration(() => setHydrated(true));
    void persistApi.rehydrate();
    return unsub;
  }, [needsHydration, persistApi]);

  return hydrated;
}
