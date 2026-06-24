import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { stackHeaderOptions } from '@/src/lib/navigation-theme';

export default function SettingsStack() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <Stack screenOptions={{ ...stackHeaderOptions(theme, t), title: t('stacks.settings') }}>
      <Stack.Screen name="workspace" options={{ title: t('stacks.workspace') }} />
      <Stack.Screen name="team" options={{ title: t('stacks.team') }} />
      <Stack.Screen name="subscription" options={{ title: t('stacks.subscription') }} />
      <Stack.Screen name="reply-style" options={{ title: t('stacks.replyStyle') }} />
      <Stack.Screen name="reply-templates" options={{ title: t('stacks.replyTemplates') }} />
      <Stack.Screen name="reply-template-edit" options={{ title: t('stacks.replyTemplateEdit') }} />
      <Stack.Screen name="profile" options={{ title: t('stacks.profileSettings') }} />
      <Stack.Screen name="data-export" options={{ title: t('stacks.dataExport') }} />
    </Stack>
  );
}
