import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  FilterChipRow,
  HubMetric,
  HubMetrics,
  HubScreen,
  HubSearchField,
  QueryRetryCard,
  SectionCard,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { ApiError } from '@/src/api/api-client';
import {
  fetchInternalBetaAccess,
  fetchInternalBetaFeedback,
  type InternalBetaFeedback,
  type InternalBetaFeedbackType,
} from '@/src/api/internal-beta-api';

type TypeFilter = 'ALL' | InternalBetaFeedbackType;

const TYPE_LABELS: Record<InternalBetaFeedbackType, string> = {
  PROBLEM: '问题',
  SUGGESTION: '建议',
  CONFUSING: '看不懂',
  OTHER: '其他',
};

export default function InternalBetaFeedbackScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const access = useQuery({
    queryKey: ['internal', 'beta-access'],
    queryFn: fetchInternalBetaAccess,
    retry: false,
  });
  const feedback = useQuery({
    queryKey: ['internal', 'beta-feedback'],
    queryFn: fetchInternalBetaFeedback,
    enabled: access.data?.allowed === true,
    retry: false,
  });

  const rows = feedback.data ?? [];
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((item) => {
      if (typeFilter !== 'ALL' && item.feedbackType !== typeFilter) return false;
      if (!needle) return true;
      return [item.displayName, item.email, item.workspaceName, item.content, item.errorCode]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [rows, search, typeFilter]);

  const typeItems = useMemo(
    () => (['ALL', 'PROBLEM', 'SUGGESTION', 'CONFUSING', 'OTHER'] as const).map((id) => ({
      id,
      label: id === 'ALL' ? '全部类型' : TYPE_LABELS[id],
      count: id === 'ALL' ? rows.length : rows.filter((item) => item.feedbackType === id).length,
    })),
    [rows],
  );

  if (access.isPending || (access.data?.allowed && feedback.isPending)) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel="加载用户反馈" color={theme.primary} />
      </View>
    );
  }
  if (access.error) {
    const forbidden = access.error instanceof ApiError && access.error.status === 403;
    return (
      <PlaceholderScreen
        title={forbidden ? '没有内部控制台权限' : '权限检查失败'}
        description={forbidden ? '当前账号不在有效内部白名单中。' : '请检查后端连接后重试。'}>
        {!forbidden ? <QueryRetryCard message={errorMessage(access.error)} onRetry={() => void access.refetch()} /> : null}
      </PlaceholderScreen>
    );
  }
  if (feedback.error) {
    return (
      <PlaceholderScreen title="反馈列表加载失败" description="请检查后端服务和数据库迁移。">
        <QueryRetryCard message={errorMessage(feedback.error)} onRetry={() => void feedback.refetch()} />
      </PlaceholderScreen>
    );
  }

  return (
    <HubScreen
      testID="screen-internal-beta-feedback"
      eyebrow="Internal only"
      title="用户反馈"
      lead="查看内测用户提交的问题与建议。"
      refreshing={feedback.isRefetching}
      onRefresh={() => void feedback.refetch()}
      toolbar={
        <View style={styles.toolbar}>
          <HubMetrics>
            <HubMetric value={String(rows.length)} label="反馈总数" />
          </HubMetrics>
          <HubSearchField
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch('')}
            placeholder="搜索姓名、邮箱、正文或错误码"
            accessibilityLabel="搜索用户反馈"
            resultCount={visibleRows.length}
          />
          <FilterChipRow items={typeItems} value={typeFilter} onChange={setTypeFilter} />
        </View>
      }>
      <SectionCard title={`反馈明细（${visibleRows.length}）`} subtitle="反馈正文可能包含用户主动填写的信息，仅限内部使用。">
        {visibleRows.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>没有符合当前条件的反馈。</Text>
        ) : (
          visibleRows.map((item) => <FeedbackCard key={item.id} item={item} />)
        )}
      </SectionCard>
    </HubScreen>
  );
}

function FeedbackCard({ item }: { item: InternalBetaFeedback }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.feedbackCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.badges}>
          <Badge label={TYPE_LABELS[item.feedbackType]} tone={item.feedbackType === 'PROBLEM' ? 'warning' : 'neutral'} />
          {item.contactAllowed ? <Badge label="可联系" tone="mint" /> : null}
        </View>
        <Text style={[styles.date, { color: theme.mutedForeground }]}>{formatDate(item.submittedAt)}</Text>
      </View>

      <Text selectable style={[styles.content, { color: theme.foreground }]}>{item.content}</Text>

      <View style={styles.metaGrid}>
        <Meta label="用户" value={item.displayName?.trim() || item.email} />
        <Meta label="注册邮箱" value={item.email} />
        <Meta label="工作区" value={item.workspaceName} />
        <Meta label="来源" value={item.sourcePage ?? '—'} />
        <Meta label="客户端" value={[item.clientPlatform, item.appVersion].filter(Boolean).join(' · ') || '—'} />
        <Meta label="错误码" value={item.errorCode ?? '—'} />
      </View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: theme.foregroundEyebrow }]}>{label}</Text>
      <Text selectable style={[styles.metaValue, { color: theme.foreground }]}>{value}</Text>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { gap: spacing.md },
  empty: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body, paddingVertical: spacing.md },
  feedbackCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  date: { fontSize: fontSize.caption },
  content: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaItem: { minWidth: 120, flexGrow: 1, flexBasis: 150, gap: 2 },
  metaLabel: { fontSize: fontSize.eyebrow, fontWeight: '700' },
  metaValue: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
});
