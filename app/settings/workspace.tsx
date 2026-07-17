import { useQueryClient } from '@tanstack/react-query';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Badge, QueryRetryCard, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { TenantMembership } from '@/src/api/tenants-api';
import { useAcceptTenantInvite } from '@/src/hooks/use-account-settings';
import { useMyTenants, useSwitchTenant } from '@/src/hooks/use-tenants';
import { alertAction } from '@/src/lib/app-dialog';
import { confirmAction } from '@/src/lib/confirm-action';

export default function SettingsWorkspaceScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const tenants = useMyTenants();
  const switchMutation = useSwitchTenant();
  const acceptMutation = useAcceptTenantInvite();

  useFocusEffect(
    useCallback(() => {
      if (!shouldUseBackendApi()) return;
      void tenants.refetch();
    }, [tenants.refetch]),
  );

  if (!shouldUseBackendApi()) {
    return (
      <PlaceholderScreen
        title={t('workspaceSettingsScreen.apiRequiredTitle')}
        description={t('workspaceSettingsScreen.apiRequiredDesc')}
      />
    );
  }

  if (tenants.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('workspaceSettingsScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (tenants.error) {
    return (
      <PlaceholderScreen
        title={t('workspaceSettingsScreen.loadFailedTitle')}
        description={t('workspaceSettingsScreen.retryDesc')}>
        <QueryRetryCard
          message={tenants.error.message}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['tenants', 'mine'] })}
        />
      </PlaceholderScreen>
    );
  }

  const list = tenants.data ?? [];

  const onSelect = (tenant: TenantMembership) => {
    if (tenant.active || tenant.status === 'INVITED' || switchMutation.isPending) return;
    void (async () => {
      const confirmed = await confirmAction({
        title: t('workspaceSettingsScreen.switchConfirmTitle'),
        message: t('workspaceSettingsScreen.switchConfirmMessage', { name: tenant.displayName }),
        cancelLabel: t('account.replayConfirm.cancel'),
        confirmLabel: t('workspaceSettingsScreen.switchAction'),
      });
      if (!confirmed) return;
      switchMutation.mutate(tenant, {
        onError: (err) => {
          void alertAction(
            t('workspaceSettingsScreen.switchFailedTitle'),
            err instanceof Error ? err.message : t('workspaceSettingsScreen.switchFailedFallback'),
          );
        },
      });
    })();
  };

  const onAccept = (tenant: TenantMembership) => {
    if (acceptMutation.isPending) return;
    acceptMutation.mutate(tenant.tenantPublicId, {
      onError: (err) => {
        void alertAction(
          t('workspaceSettingsScreen.acceptFailedTitle'),
          err instanceof Error ? err.message : t('workspaceSettingsScreen.acceptFailedFallback'),
        );
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        testID="screen-workspace-settings"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageLead, { color: theme.mutedForeground }]}>
          {t('workspaceSettingsScreen.description')}
        </Text>

      <SectionCard title={t('workspaceSettingsScreen.listTitle')} subtitle={t('workspaceSettingsScreen.listSubtitle')}>
        {list.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>{t('workspaceSettingsScreen.empty')}</Text>
        ) : (
          <View style={styles.list}>
            {list.map((tenant) => {
              const isInvited = tenant.status === 'INVITED';
              const rowStyle = [
                styles.row,
                {
                  borderColor: theme.border,
                  backgroundColor: tenant.active ? `${theme.primary}14` : theme.card,
                  opacity: switchMutation.isPending && !tenant.active ? 0.6 : 1,
                },
              ];
              const rowContent = (
                <>
                  <View style={styles.rowMain}>
                    <Text style={[styles.name, { color: theme.foreground }]}>{tenant.displayName}</Text>
                    <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                      {t('workspaceSettingsScreen.meta', {
                        type: tenant.tenantType,
                        plan: tenant.planCode,
                        role: tenant.role,
                      })}
                    </Text>
                  </View>
                  {isInvited ? (
                    <View style={styles.invitedActions}>
                      <Badge tone="warning" label={t('workspaceSettingsScreen.invitedBadge')} />
                      <Pressable
                        accessibilityRole="button"
                        disabled={acceptMutation.isPending}
                        onPress={() => onAccept(tenant)}
                        style={[styles.acceptButton, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.acceptLabel, { color: theme.primaryForeground }]}>
                          {t('workspaceSettingsScreen.acceptInvite')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : tenant.active ? (
                    <Badge tone="mint" label={t('workspaceSettingsScreen.activeBadge')} />
                  ) : (
                    <View
                      style={[
                        styles.switchButton,
                        { borderColor: theme.primary, backgroundColor: `${theme.primary}14` },
                      ]}>
                      <Text style={[styles.switchLabel, { color: theme.primary }]}>
                        {t('workspaceSettingsScreen.switchAction')}
                      </Text>
                    </View>
                  )}
                </>
              );

              if (isInvited || tenant.active) {
                return (
                  <View key={tenant.tenantPublicId} style={rowStyle}>
                    {rowContent}
                  </View>
                );
              }

              return (
                <Pressable
                  key={tenant.tenantPublicId}
                  accessibilityRole="button"
                  disabled={switchMutation.isPending}
                  onPress={() => onSelect(tenant)}
                  style={rowStyle}>
                  {rowContent}
                </Pressable>
              );
            })}
          </View>
        )}
        {switchMutation.isPending || acceptMutation.isPending ? (
          <ActivityIndicator style={styles.switching} color={theme.primary} />
        ) : null}
      </SectionCard>
      <SectionCard
        title={t('workspaceSettingsScreen.createTitle')}
        subtitle={t('workspaceSettingsScreen.createSubtitle')}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/settings/workspace-create' as Href)}
          style={[styles.createButton, { backgroundColor: theme.primary }]}>
          <Text style={[styles.createButtonLabel, { color: theme.primaryForeground }]}>
            {t('workspaceSettingsScreen.createAction')}
          </Text>
        </Pressable>
      </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  pageLead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  rowMain: { flex: 1, gap: spacing.xs },
  name: { fontSize: fontSize.body, fontWeight: '700' },
  meta: { fontSize: fontSize.caption },
  empty: { fontSize: fontSize.bodySmall },
  switching: { marginTop: spacing.md },
  invitedActions: { gap: spacing.sm, alignItems: 'flex-end' },
  acceptButton: {
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  acceptLabel: { fontSize: fontSize.caption, fontWeight: '700' },
  switchButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    flexShrink: 0,
  },
  switchLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  createButton: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  createButtonLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
});
