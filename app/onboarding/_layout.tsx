import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { stackHeaderOptions } from '@/src/lib/navigation-theme';

export default function OnboardingLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions(theme, t),
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile"
        options={{ title: t('stacks.creatorProfile'), headerLeft: () => null }}
      />
      <Stack.Screen name="consent" options={{ title: t('stacks.permissions') }} />
      <Stack.Screen name="inbox-filter" options={{ title: t('stacks.inboxFilter') }} />
      <Stack.Screen name="email" options={{ title: t('stacks.inboxSetup') }} />
      <Stack.Screen name="complete" options={{ title: t('stacks.ready'), headerLeft: () => null }} />
    </Stack>
  );
}
