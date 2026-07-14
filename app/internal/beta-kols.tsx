import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
  fetchInternalBetaDashboard,
  fetchInternalBetaAccess,
  type InternalBetaKol,
  type InternalBetaStage,
} from '@/src/api/internal-beta-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';

type StageFilter = 'ALL' | InternalBetaStage;

const STAGE_LABELS: Record<InternalBetaStage, string> = {
  REGISTERED: '已注册',
  GMAIL_CONNECTED: '已连接 Gmail',
  GMAIL_ISSUE: 'Gmail 异常',
  SYNCED: '已同步',
  BRAND_DEAL_FOUND: '已识别商单',
  DRAFTED: '已创建草稿',
  REPLIED: '已完成回复',
};

const FILTERS: readonly StageFilter[] = [
  'ALL',
  'REGISTERED',
  'GMAIL_CONNECTED',
  'GMAIL_ISSUE',
  'SYNCED',
  'BRAND_DEAL_FOUND',
  'DRAFTED',
  'REPLIED',
];

export default function InternalBetaKolsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const apiMode = shouldUseBackendApi();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<StageFilter>('ALL');

  const dashboard = useQuery({
    queryKey: ['internal', 'beta-kols'],
    queryFn: fetchInternalBetaDashboard,
    enabled: apiMode,
    retry: false,
  });
  const access = useQuery({
    queryKey: ['internal', 'beta-access'],
    queryFn: fetchInternalBetaAccess,
    enabled: apiMode,
    retry: false,
  });

  const rows = dashboard.data?.kols ?? [];
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((kol) => {
      if (stage !== 'ALL' && kol.currentStage !== stage) return false;
      if (!needle) return true;
      return [kol.displayName, kol.registrationEmail, kol.connectedGmail, kol.workspaceName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [rows, search, stage]);

  const filterItems = useMemo(
    () => FILTERS.map((id) => ({
      id,
      label: id === 'ALL' ? '全部' : STAGE_LABELS[id],
      count: id === 'ALL' ? rows.length : rows.filter((kol) => kol.currentStage === id).length,
    })),
    [rows],
  );

  if (!apiMode) {
    return (
      <PlaceholderScreen
        title="需要连接后端"
        description="请配置 EXPO_PUBLIC_API_BASE_URL，并登录真实 Creator 账号。"
      />
    );
  }

  if (dashboard.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel="加载 KOL 内测数据" color={theme.primary} />
      </View>
    );
  }

  if (dashboard.error) {
    const forbidden = dashboard.error instanceof ApiError && dashboard.error.status === 403;
    return (
      <PlaceholderScreen
        title={forbidden ? '没有内部控制台权限' : '控制台加载失败'}
        description={forbidden ? '当前登录账号不在 internal_admin_access 有效白名单中。' : '请检查本地后端和数据库连接。'}>
        {!forbidden ? (
          <QueryRetryCard
            message={dashboard.error instanceof Error ? dashboard.error.message : 'Unknown error'}
            onRetry={() => void dashboard.refetch()}
          />
        ) : null}
      </PlaceholderScreen>
    );
  }

  const summary = dashboard.data.summary;

  return (
    <HubScreen
      testID="screen-internal-beta-kols"
      eyebrow="Internal only"
      title="KOL 内测控制台"
      lead="注册后的真实产品进度。页面不展示邮件正文、附件、密码或 OAuth Token。"
      refreshing={dashboard.isRefetching}
      onRefresh={() => void dashboard.refetch()}
      toolbar={
        <View style={styles.toolbar}>
          {access.data?.role === 'BETA_ADMIN' ? (
            <View style={styles.adminActionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/internal/beta-admins')}
                style={({ pressed }) => [
                  styles.adminButton,
                  { backgroundColor: theme.primary },
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={[styles.adminButtonLabel, { color: theme.primaryForeground }]}>管理员管理</Text>
              </Pressable>
            </View>
          ) : null}
          <HubMetrics>
            <HubMetric value={String(summary.totalRegistered)} label="已注册" hint={`${summary.emailVerified} 已验证`} />
            <HubMetric value={String(summary.gmailConnected)} label="Gmail 已连接" hint={`${summary.gmailIssues} 异常`} accent={summary.gmailIssues > 0} />
            <HubMetric value={String(summary.syncSucceeded)} label="同步成功" hint="最近一次完成" />
            <HubMetric value={String(summary.withBrandDeals)} label="识别商单" hint="至少 1 条" />
          </HubMetrics>
          <HubMetrics>
            <HubMetric value={String(summary.withDrafts)} label="创建草稿" hint="至少 1 条" />
            <HubMetric value={String(summary.withReplies)} label="完成回复" hint="至少 1 条" />
          </HubMetrics>
          <HubSearchField
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch('')}
            placeholder="搜索 KOL、邮箱或工作区"
            accessibilityLabel="搜索 KOL"
            resultCount={visibleRows.length}
          />
          <FilterChipRow items={filterItems} value={stage} onChange={setStage} />
        </View>
      }>
      <SectionCard
        title={`KOL 明细（${visibleRows.length}）`}
        subtitle="Brand Deal 仅统计 Gmail 来源且分类为 commercial 的真实商机。">
        {visibleRows.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>没有符合当前条件的 KOL。</Text>
        ) : (
          visibleRows.map((kol) => <KolRow key={`${kol.userId}-${kol.workspaceId}`} kol={kol} />)
        )}
      </SectionCard>
    </HubScreen>
  );
}

function KolRow({ kol }: { kol: InternalBetaKol }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const issue = kol.currentStage === 'GMAIL_ISSUE';
  const title = kol.displayName?.trim() || kol.registrationEmail;
  const registeredAt = formatDate(kol.registeredAt);
  const lastSyncAt = formatDate(kol.gmailLastSyncAt);

  return (
    <View style={[styles.kolRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.kolHeader}>
        <View style={styles.kolIdentity}>
          <Text style={[styles.kolName, { color: theme.foreground }]}>{title}</Text>
          <Text style={[styles.kolEmail, { color: theme.mutedForeground }]}>{kol.registrationEmail}</Text>
        </View>
        <Badge tone={issue ? 'danger' : 'mint'} label={STAGE_LABELS[kol.currentStage]} />
      </View>
      <View style={styles.factGrid}>
        <Fact label="注册" value={registeredAt} />
        <Fact label="Gmail" value={kol.connectedGmail ?? kol.gmailStatus ?? '未连接'} />
        <Fact label="最近同步" value={lastSyncAt} />
        <Fact label="同步邮件" value={String(kol.syncedInboxEmailCount)} />
        <Fact label="Brand Deal" value={String(kol.brandDealCount)} />
        <Fact label="草稿" value={String(kol.replyDraftCount)} />
        <Fact label="已回复" value={String(kol.sentReplyCount)} />
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: theme.foregroundEyebrow }]}>{label}</Text>
      <Text style={[styles.factValue, { color: theme.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { gap: spacing.md },
  adminActionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  adminButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  adminButtonLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  buttonPressed: { opacity: 0.78 },
  empty: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body, paddingVertical: spacing.md },
  kolRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  kolHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  kolIdentity: { flex: 1, minWidth: 0, gap: 2 },
  kolName: { fontSize: fontSize.body, fontWeight: '700' },
  kolEmail: { fontSize: fontSize.caption },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: { minWidth: 96, flexGrow: 1, flexBasis: 110, gap: 2 },
  factLabel: { fontSize: fontSize.eyebrow, fontWeight: '700' },
  factValue: { fontSize: fontSize.bodySmall, fontWeight: '600' },
});
