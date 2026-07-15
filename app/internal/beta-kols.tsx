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
  type InternalCommercialProcessingAnalytics,
  type InternalGmailOAuthAnalytics,
  type InternalMailboxSyncAnalytics,
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
      <GmailOAuthAnalyticsPanel analytics={dashboard.data.gmailOAuth} />
      <MailboxSyncAnalyticsPanel analytics={dashboard.data.mailboxSync} />
      <CommercialProcessingAnalyticsPanel analytics={dashboard.data.commercialProcessing} />
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

function CommercialProcessingAnalyticsPanel({ analytics }: { analytics: InternalCommercialProcessingAnalytics }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <SectionCard
      title={`商业邮件识别与 Brief（近 ${analytics.periodDays} 天）`}
      subtitle="按邮件处理任务去重；失败仅统计达到最终重试上限的任务。">
      <HubMetrics>
        <HubMetric value={String(analytics.detectionStarted)} label="开始识别" hint="进入处理链路" />
        <HubMetric
          value={String(analytics.commercialDetected)}
          label="识别为商单"
          hint={`${formatRate(analytics.commercialDetected, analytics.detectionStarted)} / 开始`}
        />
        <HubMetric value={String(analytics.nonCommercial)} label="非商业邮件" hint="已完成分类" />
        <HubMetric
          value={String(analytics.detectionFailed)}
          label="识别失败"
          hint={`${formatRate(analytics.detectionFailed, analytics.detectionStarted)} / 开始`}
          accent={analytics.detectionFailed > 0}
        />
      </HubMetrics>
      <HubMetrics>
        <HubMetric value={String(analytics.detectionInProgress)} label="识别处理中" hint="尚无最终结果" />
        <HubMetric value={String(analytics.briefStarted)} label="Brief 开始" hint="商业邮件进入提取" />
        <HubMetric
          value={String(analytics.briefSucceeded)}
          label="Brief 成功"
          hint={`${formatRate(analytics.briefSucceeded, analytics.briefStarted)} / 开始`}
        />
        <HubMetric
          value={String(analytics.briefFailed)}
          label="Brief 失败"
          hint={`${analytics.briefInProgress} 处理中`}
          accent={analytics.briefFailed > 0}
        />
      </HubMetrics>
      <HubMetrics>
        <HubMetric value={formatDuration(analytics.averageDetectionDurationMs)} label="识别平均耗时" hint="最终结果" />
        <HubMetric value={formatDuration(analytics.averageBriefDurationMs)} label="Brief 平均耗时" hint="最终结果" />
        <HubMetric value={String(analytics.classificationCorrections)} label="人工纠正" hint="分类纠正次数" />
      </HubMetrics>
      <View style={styles.failureBlock}>
        <Text style={[styles.failureTitle, { color: theme.foreground }]}>处理失败原因 Top 5</Text>
        {analytics.failureReasons.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>近 30 天暂无最终处理失败。</Text>
        ) : (
          analytics.failureReasons.map((reason) => (
            <View key={`${reason.stage}-${reason.failureCode}`} style={[styles.failureRow, { borderColor: theme.border }]}>
              <View style={styles.failureCopy}>
                <Text style={[styles.failureLabel, { color: theme.foreground }]}>
                  {formatProcessingStage(reason.stage)} · {formatProcessingFailureCode(reason.failureCode)}
                </Text>
                <Text style={[styles.failureCode, { color: theme.mutedForeground }]} numberOfLines={1}>
                  {reason.failureCode}
                </Text>
              </View>
              <Badge tone="danger" label={String(reason.count)} />
            </View>
          ))
        )}
      </View>
    </SectionCard>
  );
}

function MailboxSyncAnalyticsPanel({ analytics }: { analytics: InternalMailboxSyncAnalytics }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <SectionCard
      title={`首次邮件同步（近 ${analytics.periodDays} 天）`}
      subtitle={`从 Gmail 连接到首次同步平均等待 ${formatDuration(analytics.averageConnectionToStartMs)}。`}>
      <HubMetrics>
        <HubMetric value={String(analytics.started)} label="开始同步" hint="首次同步任务" />
        <HubMetric
          value={String(analytics.succeeded)}
          label="同步成功"
          hint={`${formatRate(analytics.succeeded, analytics.started)} / 开始`}
        />
        <HubMetric
          value={String(analytics.empty)}
          label="同步为空"
          hint={`${formatRate(analytics.empty, analytics.started)} / 开始`}
          accent={analytics.empty > 0}
        />
        <HubMetric
          value={String(analytics.failed)}
          label="同步失败"
          hint={`${formatRate(analytics.failed, analytics.started)} / 开始`}
          accent={analytics.failed > 0}
        />
      </HubMetrics>
      <HubMetrics>
        <HubMetric value={String(analytics.inProgress)} label="进行中" hint="暂无最终结果" />
        <HubMetric value={String(analytics.totalProcessed)} label="处理邮件" hint="首次同步合计" />
        <HubMetric value={String(analytics.totalNewMessages)} label="新增邮件" hint="首次同步合计" />
        <HubMetric value={formatDuration(analytics.averageDurationMs)} label="平均耗时" hint="首次同步执行" />
      </HubMetrics>
      <View style={styles.failureBlock}>
        <Text style={[styles.failureTitle, { color: theme.foreground }]}>同步失败原因 Top 5</Text>
        {analytics.failureReasons.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>近 30 天暂无首次同步失败。</Text>
        ) : (
          analytics.failureReasons.map((reason) => (
            <View key={reason.failureCode} style={[styles.failureRow, { borderColor: theme.border }]}>
              <View style={styles.failureCopy}>
                <Text style={[styles.failureLabel, { color: theme.foreground }]}>
                  {formatSyncFailureCode(reason.failureCode)}
                </Text>
                <Text style={[styles.failureCode, { color: theme.mutedForeground }]} numberOfLines={1}>
                  {reason.failureCode}
                </Text>
              </View>
              <Badge tone="danger" label={String(reason.count)} />
            </View>
          ))
        )}
      </View>
    </SectionCard>
  );
}

function GmailOAuthAnalyticsPanel({ analytics }: { analytics: InternalGmailOAuthAnalytics }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const failures = analytics.connectFailed + analytics.oauthFailed;

  return (
    <SectionCard
      title={`Gmail 授权过程（近 ${analytics.periodDays} 天）`}
      subtitle="按单次授权 flow 统计；连接成功与连接失败以服务端结果为准。">
      <HubMetrics>
        <HubMetric value={String(analytics.viewed)} label="看到连接页" hint="入口曝光" />
        <HubMetric
          value={String(analytics.started)}
          label="发起授权"
          hint={`${formatRate(analytics.started, analytics.viewed)} / 曝光`}
        />
        <HubMetric
          value={String(analytics.callbackReceived)}
          label="收到回调"
          hint={`${formatRate(analytics.callbackReceived, analytics.started)} / 发起`}
        />
        <HubMetric
          value={String(analytics.succeeded)}
          label="连接成功"
          hint={`${formatRate(analytics.succeeded, analytics.started)} · ${formatDuration(analytics.averageConnectDurationMs)}`}
        />
      </HubMetrics>
      <HubMetrics>
        <HubMetric
          value={String(analytics.cancelled)}
          label="用户取消"
          hint={`${formatRate(analytics.cancelled, analytics.started)} / 发起`}
          accent={analytics.cancelled > 0}
        />
        <HubMetric
          value={String(analytics.skipped)}
          label="跳过连接"
          hint={`${formatRate(analytics.skipped, analytics.viewed)} / 曝光`}
          accent={analytics.skipped > 0}
        />
        <HubMetric
          value={String(analytics.oauthFailed)}
          label="授权异常"
          hint="Google 回调前后"
          accent={analytics.oauthFailed > 0}
        />
        <HubMetric
          value={String(analytics.connectFailed)}
          label="连接失败"
          hint="服务端确认"
          accent={analytics.connectFailed > 0}
        />
      </HubMetrics>
      <View style={styles.failureBlock}>
        <Text style={[styles.failureTitle, { color: theme.foreground }]}>失败原因 Top 5</Text>
        {failures === 0 || analytics.failureReasons.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>近 30 天暂无授权或连接失败。</Text>
        ) : (
          analytics.failureReasons.map((reason) => (
            <View key={reason.failureCode} style={[styles.failureRow, { borderColor: theme.border }]}>
              <View style={styles.failureCopy}>
                <Text style={[styles.failureLabel, { color: theme.foreground }]}>
                  {formatFailureCode(reason.failureCode)}
                </Text>
                <Text style={[styles.failureCode, { color: theme.mutedForeground }]} numberOfLines={1}>
                  {reason.failureCode}
                </Text>
              </View>
              <Badge tone="danger" label={String(reason.count)} />
            </View>
          ))
        )}
      </View>
    </SectionCard>
  );
}

function KolRow({ kol }: { kol: InternalBetaKol }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const issue = kol.currentStage === 'GMAIL_ISSUE';
  const title = kol.displayName?.trim() || kol.registrationEmail;
  const registeredAt = formatDate(kol.registeredAt);
  const lastSyncAt = formatDate(kol.gmailLastSyncAt);
  const lastOAuthAt = formatDate(kol.gmailOAuthLastEventAt);

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
        <Fact label="首次同步" value={formatFirstSyncEvent(kol.firstSyncLastEventType)} />
        {kol.firstSyncLastEventAt ? <Fact label="首次同步时间" value={formatDate(kol.firstSyncLastEventAt)} /> : null}
        {kol.firstSyncNewCount != null ? <Fact label="首次新增邮件" value={String(kol.firstSyncNewCount)} /> : null}
        {kol.firstSyncLastFailureCode ? (
          <Fact label="首次同步失败" value={formatSyncFailureCode(kol.firstSyncLastFailureCode)} />
        ) : null}
        <Fact label="最近授权步骤" value={formatOAuthEvent(kol.gmailOAuthLastEventType)} />
        <Fact label="授权时间" value={lastOAuthAt} />
        <Fact
          label="授权入口 / 平台"
          value={kol.gmailOAuthLastEventType
            ? formatOAuthContext(kol.gmailOAuthLastSource, kol.gmailOAuthLastPlatform)
            : '—'}
        />
        <Fact
          label="授权失败原因"
          value={kol.gmailOAuthLastFailureCode
            ? formatFailureCode(kol.gmailOAuthLastFailureCode)
            : '—'}
        />
        <Fact label="同步邮件" value={String(kol.syncedInboxEmailCount)} />
        <Fact label="Brand Deal" value={String(kol.brandDealCount)} />
        <Fact label="最近商业处理" value={formatCommercialProcessingEvent(kol.commercialProcessingLastEventType)} />
        {kol.commercialProcessingLastEventAt ? (
          <Fact label="商业处理时间" value={formatDate(kol.commercialProcessingLastEventAt)} />
        ) : null}
        {kol.commercialProcessingLastStage ? (
          <Fact label="处理卡点" value={formatProcessingStage(kol.commercialProcessingLastStage)} />
        ) : null}
        {kol.commercialProcessingLastCategory ? (
          <Fact label="最近分类" value={formatProcessingCategory(kol.commercialProcessingLastCategory)} />
        ) : null}
        {kol.commercialProcessingLastFailureCode ? (
          <Fact label="处理失败原因" value={formatProcessingFailureCode(kol.commercialProcessingLastFailureCode)} />
        ) : null}
        <Fact label="草稿" value={String(kol.replyDraftCount)} />
        <Fact label="已回复" value={String(kol.sentReplyCount)} />
      </View>
    </View>
  );
}

function formatRate(value: number, base: number): string {
  if (base <= 0) return '—';
  return `${Math.round((value / base) * 100)}%`;
}

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return '—';
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatOAuthEvent(value?: string | null): string {
  switch (value) {
    case 'GMAIL_CONNECT_VIEWED': return '看到连接页';
    case 'GMAIL_OAUTH_STARTED': return '发起授权';
    case 'GMAIL_OAUTH_CALLBACK_RECEIVED': return '收到 Google 回调';
    case 'GMAIL_OAUTH_CANCELLED': return '用户取消授权';
    case 'GMAIL_OAUTH_FAILED': return '授权异常';
    case 'GMAIL_CONNECT_SUCCEEDED': return '连接成功';
    case 'GMAIL_CONNECT_FAILED': return '连接失败';
    case 'GMAIL_CONNECT_SKIPPED': return '跳过连接';
    default: return '尚未尝试';
  }
}

function formatFailureCode(value: string): string {
  switch (value) {
    case 'GOOGLE_ACCESS_DENIED': return '用户拒绝 Google 权限';
    case 'GOOGLE_USER_CANCELLED': return '用户取消授权';
    case 'GOOGLE_TOKEN_EXCHANGE_FAILED': return '授权码换取 Token 失败';
    case 'INVALID_ACCESS_TOKEN': return 'Google Access Token 无效';
    case 'MISSING_GOOGLE_TOKEN_OR_CODE': return '缺少授权码或 Token';
    case 'GOOGLE_OAUTH_ERROR': return 'Google 授权异常';
    case 'INTERNAL_ERROR': return '服务端内部异常';
    default: return value;
  }
}

function formatOAuthContext(source?: string | null, platform?: string | null): string {
  const sourceLabel = source === 'account'
    ? '账号页'
    : source === 'inbox_repair'
      ? '收件箱修复'
      : source === 'draft_send'
        ? '草稿发送'
        : source === 'onboarding'
          ? '入驻流程'
          : source ?? '未知入口';
  const platformLabel = platform === 'ios'
    ? 'iOS'
    : platform === 'android'
      ? 'Android'
      : platform === 'web'
        ? 'Web'
        : platform ?? '未知平台';
  return `${sourceLabel} / ${platformLabel}`;
}

function formatSyncFailureCode(value: string): string {
  switch (value) {
    case 'MAILBOX_NOT_CONNECTED': return '同步时邮箱未连接';
    case 'MAILBOX_ACCESS_TOKEN_MISSING': return '缺少 Gmail Access Token';
    case 'TOKEN_DECRYPT_FAILED': return '授权凭据读取失败';
    case 'MAILBOX_SYNC_TIMEOUT': return '同步任务超时';
    case 'INVALID_SYNC_LOOKBACK': return '同步范围参数无效';
    case 'MAILBOX_SYNC_FAILED': return '邮件同步异常';
    default: return value;
  }
}

function formatFirstSyncEvent(value?: string | null): string {
  switch (value) {
    case 'MAILBOX_SYNC_STARTED': return '同步中';
    case 'MAILBOX_SYNC_SUCCEEDED': return '成功拉到邮件';
    case 'MAILBOX_SYNC_EMPTY': return '成功，但没有新邮件';
    case 'MAILBOX_SYNC_FAILED': return '同步失败';
    default: return '尚未开始';
  }
}

function formatCommercialProcessingEvent(value?: string | null): string {
  switch (value) {
    case 'COMMERCIAL_DETECTION_STARTED': return '正在识别邮件';
    case 'COMMERCIAL_DETECTION_SUCCEEDED': return '识别为商业邮件';
    case 'COMMERCIAL_DETECTION_EMPTY': return '识别为非商业邮件';
    case 'COMMERCIAL_DETECTION_FAILED': return '邮件识别失败';
    case 'BRIEF_EXTRACTION_STARTED': return '正在提取 Brief';
    case 'BRIEF_EXTRACTION_SUCCEEDED': return 'Brief 提取成功';
    case 'BRIEF_EXTRACTION_FAILED': return 'Brief 提取失败';
    default: return '尚未处理';
  }
}

function formatProcessingStage(value: string): string {
  switch (value) {
    case 'START': return '任务启动';
    case 'EXTRACT_EMAIL': return '邮件信息提取';
    case 'CLASSIFY': return '邮件分类';
    case 'LINK_OPPORTUNITY': return '关联商机';
    case 'CLASSIFY_OPPORTUNITY': return '商机分类';
    case 'EXTRACT_BRIEF': return 'Brief 提取';
    case 'DONE': return '处理完成';
    default: return value;
  }
}

function formatProcessingFailureCode(value: string): string {
  switch (value) {
    case 'PROCESSING_TIMEOUT': return '处理超时';
    case 'INVALID_PIPELINE_STATE': return '处理链路状态异常';
    case 'COMMERCIAL_DETECTION_FAILED': return '商业邮件识别异常';
    case 'BRIEF_EXTRACTION_FAILED': return 'Brief 提取异常';
    default: return value;
  }
}

function formatProcessingCategory(value: string): string {
  switch (value.toUpperCase()) {
    case 'COMMERCIAL': return '商业合作';
    case 'CREATOR_PLATFORM': return '创作者平台';
    case 'NEWSLETTER': return 'Newsletter';
    case 'SPAM': return '垃圾邮件';
    case 'OTHER': return '其他';
    default: return value;
  }
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
  failureBlock: { gap: spacing.sm, paddingTop: spacing.sm },
  failureTitle: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  failureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  failureCopy: { flex: 1, minWidth: 0, gap: 2 },
  failureLabel: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  failureCode: { fontSize: fontSize.caption },
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
