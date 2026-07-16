import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { stackHeaderOptions } from '@/src/lib/navigation-theme';

export default function InternalStack() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Stack screenOptions={stackHeaderOptions(theme, t)}>
      <Stack.Screen name="beta-kols" options={{ title: 'KOL Beta Console' }} />
      <Stack.Screen name="beta-admins" options={{ title: '管理员管理' }} />
      <Stack.Screen name="beta-feedback" options={{ title: '用户反馈' }} />
    </Stack>
  );
}
