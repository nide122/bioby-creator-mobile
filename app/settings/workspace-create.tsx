import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { getTextInputProps, getTextInputStyle, HubScreen, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, spacing } from '@/constants/tokens';
import { useCreateTenant } from '@/src/hooks/use-tenants';
import { alertAction } from '@/src/lib/app-dialog';

export default function CreateWorkspaceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [displayName, setDisplayName] = useState('');
  const createMutation = useCreateTenant();
  const canSubmit = displayName.trim().length > 0 && displayName.trim().length <= 160;

  const onCreate = () => {
    if (!canSubmit || createMutation.isPending) return;
    createMutation.mutate(displayName, {
      onSuccess: () => router.replace('/settings/workspace'),
      onError: (error) => {
        void alertAction(
          t('workspaceCreateScreen.failedTitle'),
          error instanceof Error ? error.message : t('workspaceCreateScreen.failedFallback'),
        );
      },
    });
  };

  return (
    <HubScreen
      eyebrow={t('tabs.account')}
      title={t('workspaceCreateScreen.title')}
      lead={t('workspaceCreateScreen.description')}>
      <SectionCard
        title={t('workspaceCreateScreen.nameTitle')}
        subtitle={t('workspaceCreateScreen.nameSubtitle')}>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={160}
          placeholder={t('workspaceCreateScreen.namePlaceholder')}
          returnKeyType="done"
          onSubmitEditing={onCreate}
          {...getTextInputProps(theme)}
          style={getTextInputStyle(theme)}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit || createMutation.isPending}
          onPress={onCreate}
          style={[
            styles.primary,
            { backgroundColor: canSubmit && !createMutation.isPending ? theme.primary : theme.secondary },
          ]}>
          {createMutation.isPending ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('workspaceCreateScreen.createAction')}
            </Text>
          )}
        </Pressable>
      </SectionCard>
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
});
