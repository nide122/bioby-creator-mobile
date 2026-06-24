import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { stackHeaderOptions } from '@/src/lib/navigation-theme';

export default function BrandLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Stack screenOptions={stackHeaderOptions(theme, t)}>
      <Stack.Screen name="[brandId]" options={{ title: t('stacks.brand') }} />
    </Stack>
  );
}
