import 'react-native-gesture-handler';
import '@/src/auth/complete-oauth-session';
import '@/src/i18n';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppDialogHost } from '@/components/product';
import { AuthSessionSync } from '@/components/AuthSessionSync';
import { DevTestSeed } from '@/components/DevTestSeed';
import { LanguagePreferenceSync } from '@/components/LanguagePreferenceSync';
import { NavigationBootstrap } from '@/components/NavigationBootstrap';
import { PushNotificationHandler } from '@/src/push/push-notification-handler';
import { PushRegistrationSync } from '@/src/push/push-registration-sync';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { queryClient } from '@/src/lib/query-client';
import { stackHeaderOptions } from '@/src/lib/navigation-theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  /** Public OAuth-compliant landing; auth forms live at /login and /register. */
  initialRouteName: 'home',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore repeated calls during fast refresh.
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppDialogHost>
          <Stack screenOptions={stackHeaderOptions(theme, t)}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="ops" options={{ headerShown: false }} />
          <Stack.Screen name="deal" options={{ headerShown: false }} />
          <Stack.Screen name="brand" options={{ headerShown: false }} />
          <Stack.Screen name="battle-reports" options={{ headerShown: false }} />
          <Stack.Screen name="drafts" options={{ headerShown: false }} />
          <Stack.Screen name="proposal" options={{ headerShown: false }} />
          <Stack.Screen name="payments" options={{ title: t('stacks.payments') }} />
          <Stack.Screen name="disputes" options={{ title: t('stacks.disputes') }} />
          <Stack.Screen name="pricing" options={{ title: t('stacks.pricing') }} />
          <Stack.Screen name="pricing-edit" options={{ title: t('stacks.pricingEdit') }} />
          <Stack.Screen name="media-kit" options={{ title: t('stacks.mediaKit') }} />
          <Stack.Screen name="media-kit-edit" options={{ title: t('stacks.mediaKitEdit') }} />
          <Stack.Screen name="media-kit-public" options={{ title: t('stacks.mediaKitPublic') }} />
          <Stack.Screen name="c" options={{ headerShown: false }} />
          <Stack.Screen name="trust-passport" options={{ title: t('stacks.trustPassport') }} />
          <Stack.Screen name="team" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="privacy" options={{ title: t('stacks.privacy') }} />
          <Stack.Screen name="terms" options={{ title: t('stacks.terms') }} />
          <Stack.Screen name="opportunity-manual" options={{ title: t('stacks.opportunityManual') }} />
        </Stack>
        <LanguagePreferenceSync />
        <AuthSessionSync />
        <PushRegistrationSync />
        <PushNotificationHandler />
        <DevTestSeed />
        <NavigationBootstrap />
          </AppDialogHost>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
