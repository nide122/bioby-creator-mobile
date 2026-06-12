import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import i18n from '@/src/i18n';
import { resolveLanguagePreference, useLocaleStore } from '@/src/stores/locale-store';

/**
 * When preference is "system", refresh i18n after returning from background
 * (user may have changed OS language).
 */
export function LanguagePreferenceSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onLanguageChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['growth'] });
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, [queryClient]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const pref = useLocaleStore.getState().languagePreference;
      if (pref === 'system') {
        void i18n.changeLanguage(resolveLanguagePreference('system'));
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}
