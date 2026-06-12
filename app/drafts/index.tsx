import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type Href, useRouter } from 'expo-router';

import {
  EmptyStateCard,
  HubListRow,
  HubMetric,
  HubMetrics,
  HubScreen,
  QueryRetryCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { useDomainLabels } from '@/src/hooks/use-domain-labels';
import { useDrafts } from '@/src/hooks/use-drafts';
import { useDraftApprovalStore } from '@/src/stores/draft-approval-store';

export default function DraftsIndexScreen() {
  const { t } = useTranslation();
  const { draftKindLabel } = useDomainLabels();
  const router = useRouter();
  const queryClient = useQueryClient();
  const drafts = useDrafts();
  const isDraftApproved = useDraftApprovalStore((s) => s.isDraftApproved);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (drafts.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} accessibilityLabel={t('draftsScreen.loadingA11y')} />
      </View>
    );
  }

  if (drafts.error) {
    return (
      <PlaceholderScreen title={t('draftsScreen.errorTitle')} description={t('draftsScreen.errorHint')}>
        <QueryRetryCard
          message={drafts.error.message}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['drafts'] })}
        />
      </PlaceholderScreen>
    );
  }

  const rows = drafts.data ?? [];
  const pendingApprovalCount = rows.filter((item) => item.requiresApproval && !isDraftApproved(item.id)).length;
  const readyCount = rows.filter((item) => !item.requiresApproval || isDraftApproved(item.id)).length;

  return (
    <HubScreen
      eyebrow={t('tabs.assets')}
      title={t('draftsScreen.listTitle')}
      lead={t('draftsScreen.listLead')}
      toolbar={
        <HubMetrics>
          <HubMetric
            value={String(pendingApprovalCount)}
            label={t('draftsScreen.tabPendingTitle')}
            accent={pendingApprovalCount > 0}
          />
          <HubMetric value={String(readyCount)} label={t('draftsScreen.tabReadyTitle')} />
        </HubMetrics>
      }>
      {rows.length === 0 ? (
        <EmptyStateCard
          title={t('draftsScreen.emptyRowsTitle')}
          description={t('draftsScreen.emptyRowsHint')}
          primaryAction={{
            label: t('draftsScreen.openInboxAction'),
            onPress: () => router.push('/inbox' as Href),
          }}
          secondaryAction={{
            label: t('draftsScreen.goProposal'),
            onPress: () => router.push('/proposal/sample' as Href),
          }}
        />
      ) : (
        <SettingsGroup title={t('draftsScreen.queueHeading')}>
          {rows.map((item) => {
            const pending = item.requiresApproval && !isDraftApproved(item.id);
            const detail = isDraftApproved(item.id)
              ? t('draftsScreen.badgeApproved')
              : pending
                ? t('draftsScreen.badgePending')
                : t('draftsScreen.badgeSafeSend');

            return (
              <HubListRow
                key={item.id}
                icon="create-outline"
                title={item.title}
                subtitle={[draftKindLabel[item.kind], item.sourceBrandHint].filter(Boolean).join(' · ')}
                detail={detail}
                detailAccent={pending}
                onPress={() => router.push({ pathname: '/drafts/[id]', params: { id: item.id } })}
              />
            );
          })}
        </SettingsGroup>
      )}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
