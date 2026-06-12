import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { stackHeaderOptions } from '@/src/lib/navigation-theme';

export default function InboxStackLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Stack
      screenOptions={stackHeaderOptions(theme, t)}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[threadId]" options={{ title: t('stacks.inboxThread') }} />
      <Stack.Screen name="message/[messageId]" options={{ title: t('stacks.inboxMessage') }} />
    </Stack>
  );
}
