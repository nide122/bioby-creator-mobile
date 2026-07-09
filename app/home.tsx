import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MarketingHomeView } from '@/components/legal/MarketingHomeView';
import { DEFAULT_APP_HOME_ROUTE } from '@/src/auth/post-auth-navigation';
import { enterDemoWorkspace } from '@/src/auth/enter-demo-workspace';
import { getHomeContent } from '@/src/legal';
import { runAfterLocaleHydration, useLocaleStore } from '@/src/stores/locale-store';

export default function HomeScreen() {
  const router = useRouter();
  useTranslation();

  useEffect(() => {
    return runAfterLocaleHydration(() => {
      void useLocaleStore.getState().applyWelcomeSystemLanguage();
    });
  }, []);

  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    const flag = qs.get('testWorkspace');
    if (flag !== '1' && flag !== 'true') return;
    void enterDemoWorkspace().then(() => {
      requestAnimationFrame(() => {
        router.replace(DEFAULT_APP_HOME_ROUTE as Href);
      });
    });
  }, [router]);

  return <MarketingHomeView content={getHomeContent()} />;
}
