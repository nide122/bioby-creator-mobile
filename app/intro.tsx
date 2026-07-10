import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ProductIntroView } from '@/components/legal/ProductIntroView';
import { getHomeContent } from '@/src/legal';
import { runAfterLocaleHydration, useLocaleStore } from '@/src/stores/locale-store';

/** Public product introduction — shown before the sign-in landing (/home). */
export default function IntroScreen() {
  useTranslation();

  useEffect(() => {
    return runAfterLocaleHydration(() => {
      void useLocaleStore.getState().applyWelcomeSystemLanguage();
    });
  }, []);

  return <ProductIntroView content={getHomeContent()} />;
}
