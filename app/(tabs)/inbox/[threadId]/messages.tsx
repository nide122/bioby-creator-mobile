import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { HubScreen, QueryRetryCard } from '@/components/product';
import { InboxThreadMessageList } from '@/components/inbox/InboxThreadMessageList';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { layout, palette } from '@/constants/tokens';
import { calendarLocaleTagForLanguage } from '@/src/i18n';
import { inboxMessageHref } from '@/src/lib/open-brand-detail';
import { useReturnToBackNavigation } from '@/src/lib/use-return-to-back-navigation';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { resolveOpportunityBrandLabel } from '@/src/lib/cooperation-display-name';
import { useTenantQueryKey } from '@/src/lib/tenant-query';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { InboxMessage } from '@/src/types/domain';

export default function InboxThreadMessagesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    threadId?: string | string[];
    returnTo?: string | string[];
    parentReturnTo?: string | string[];
  }>();
  const threadId = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const parentReturnTo = Array.isArray(params.parentReturnTo) ? params.parentReturnTo[0] : params.parentReturnTo;
  useReturnToBackNavigation(returnTo, parentReturnTo);

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const dateLocale = calendarLocaleTagForLanguage(i18n.language);
  const apiMode = shouldUseBackendApi();
  const detailQueryKey = useTenantQueryKey('inbox', 'thread', threadId, { api: apiMode });
  const query = useInboxThreadDetail(threadId);

  if (!threadId) {
    return (
      <PlaceholderScreen
        title={t('inboxThreadDetail.missingTitle')}
        description={t('inboxThreadDetail.missingDesc')}
      />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('inboxThreadDetail.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <PlaceholderScreen title={t('inboxThreadDetail.errorTitle')} description={t('inboxThreadDetail.errorDesc')}>
        <QueryRetryCard
          message={query.error?.message ?? t('inboxThreadDetail.noData')}
          onRetry={() => queryClient.invalidateQueries({ queryKey: detailQueryKey })}
        />
      </PlaceholderScreen>
    );
  }

  const detail = query.data;
  const brandLabel = resolveOpportunityBrandLabel(detail.brandName, detail.subject, detail.claimedBrandName);

  const openMessage = (message: InboxMessage) => {
    router.push(
      inboxMessageHref(message.id, threadId, returnTo || parentReturnTo ? { returnTo, parentReturnTo } : null),
    );
  };

  return (
    <HubScreen testID="screen-inbox-thread-messages">
      <InboxThreadMessageList
        messages={detail.messages}
        dateLocale={dateLocale}
        counterpartyLabel={brandLabel ?? undefined}
        onOpenMessage={openMessage}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: layout.tabScreenPaddingX },
});
