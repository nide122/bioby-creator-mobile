import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

import { navigateReturnTo } from '@/src/lib/open-brand-detail';

/**
 * When a screen is opened with returnTo (e.g. inbox thread from brand detail),
 * the inbox nested stack still contains the list underneath. Hardware / swipe back
 * would pop to /inbox instead of the return target — intercept those exits.
 */
export function useReturnToBackNavigation(returnTo?: string | null, parentReturnTo?: string | null) {
  const router = useRouter();
  const navigation = useNavigation();

  const goToReturnTo = useCallback(() => {
    if (!returnTo) return false;
    navigateReturnTo(router, returnTo, parentReturnTo);
    return true;
  }, [parentReturnTo, returnTo, router]);

  useFocusEffect(
    useCallback(() => {
      if (!returnTo) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', goToReturnTo);
      return () => subscription.remove();
    }, [returnTo, goToReturnTo]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!returnTo) return undefined;
      const unsubscribe = navigation.addListener('beforeRemove', (event) => {
        const actionType = event.data.action.type;
        if (actionType !== 'GO_BACK' && actionType !== 'POP') {
          return;
        }
        event.preventDefault();
        goToReturnTo();
      });
      return unsubscribe;
    }, [navigation, returnTo, goToReturnTo]),
  );
}
