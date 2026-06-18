import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { DraftListItemDto } from '@/src/api/draft-mappers';
import { mapOpportunityToDetail, mapOpportunityToThread } from '@/src/api/opportunity-mappers';
import type {
  BriefView,
  OpportunityDetail,
  OpportunityListItem,
  OpportunityListPage,
  OpportunityTimeline,
} from '@/src/api/opportunity-types';
import { fetchMockInboxThreadDetail, fetchMockInboxThreads } from '@/src/api/mock-inbox';
import { isOpportunityNeedsAction } from '@/src/lib/opportunity-needs-action';
import { resolvePriorityLeadValueBand } from '@/src/lib/priority-lead-value-band';
import type { InboxEmailCategory, InboxThread, InboxThreadDetail } from '@/src/types/domain';

export type OpportunityTimeRange = 'ALL' | 'ONE_WEEK' | 'ONE_MONTH' | 'THREE_MONTHS';
export type OpportunitySortBy = 'TIME' | 'MESSAGE_COUNT' | 'CLASSIFICATION_SCORE';
export type OpportunitySortDirection = 'ASC' | 'DESC';

export type OpportunityListFilters = {
  actionTier?: string;
  emailCategory?: string;
  leadStage?: string;
  leadValueBand?: string;
  needsAction?: boolean;
  timeRange?: OpportunityTimeRange;
  sortBy?: OpportunitySortBy;
  sortDirection?: OpportunitySortDirection;
};

type OpportunityPageOptions = {
  page?: number;
  size?: number;
};

export type OpportunityThreadPage = {
  items: InboxThread[];
  page: number;
  size: number;
  hasMore: boolean;
  categoryCounts: Record<InboxEmailCategory, number>;
  valueBandCounts?: Record<string, number>;
};

const EMPTY_CATEGORY_COUNTS: Record<InboxEmailCategory, number> = {
  commercial: 0,
  pr_sample: 0,
  media: 0,
  personal: 0,
  spam: 0,
  other: 0,
};

const EMPTY_VALUE_BAND_COUNTS: Record<string, number> = {
  high_value: 0,
  needs_negotiation: 0,
  archived: 0,
};

function categoryCountsFromThreads(items: InboxThread[]): Record<InboxEmailCategory, number> {
  const counts = { ...EMPTY_CATEGORY_COUNTS };
  for (const item of items) {
    counts[item.category] += 1;
  }
  return counts;
}

function normalizeCategoryCounts(raw?: Record<string, number>): Record<InboxEmailCategory, number> {
  return {
    commercial: raw?.commercial ?? 0,
    pr_sample: raw?.pr_sample ?? 0,
    media: raw?.media ?? 0,
    personal: raw?.personal ?? 0,
    spam: raw?.spam ?? 0,
    other: raw?.other ?? 0,
  };
}

function normalizeValueBandCounts(raw?: Record<string, number>): Record<string, number> {
  return {
    high_value: raw?.high_value ?? 0,
    needs_negotiation: raw?.needs_negotiation ?? 0,
    archived: raw?.archived ?? 0,
  };
}

function valueBandCountsFromThreads(items: InboxThread[]): Record<string, number> {
  const counts = { ...EMPTY_VALUE_BAND_COUNTS };
  for (const item of items) {
    const band = resolvePriorityLeadValueBand(item) ?? item.leadValueBand;
    if (band) {
      counts[band] = (counts[band] ?? 0) + 1;
    }
  }
  return counts;
}

function matchesNeedsAction(item: InboxThread): boolean {
  return isOpportunityNeedsAction(item);
}

function applyFilters(items: InboxThread[], filters?: OpportunityListFilters): InboxThread[] {
  if (!filters) return items;
  const timeSince = timeRangeSince(filters.timeRange);
  return items.filter((item) => {
    if (filters.needsAction && !matchesNeedsAction(item)) return false;
    if (filters.actionTier && item.actionTier !== filters.actionTier) return false;
    if (filters.emailCategory && item.category !== filters.emailCategory) return false;
    if (filters.leadStage && item.leadStage !== filters.leadStage) return false;
    if (filters.leadValueBand && item.leadValueBand !== filters.leadValueBand) return false;
    if (timeSince && new Date(item.updatedAtISO).getTime() < timeSince) return false;
    return true;
  });
}

function timeRangeSince(range?: OpportunityTimeRange): number | null {
  const now = Date.now();
  switch (range) {
    case 'ONE_WEEK':
      return now - 7 * 24 * 60 * 60 * 1000;
    case 'ONE_MONTH':
      return now - 30 * 24 * 60 * 60 * 1000;
    case 'THREE_MONTHS':
      return now - 90 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function applySort(
  items: InboxThread[],
  sortBy?: OpportunitySortBy,
  sortDirection?: OpportunitySortDirection
): InboxThread[] {
  const direction = sortDirection === 'ASC' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortBy === 'MESSAGE_COUNT') {
      const countDelta = (a.messageCount ?? 1) - (b.messageCount ?? 1);
      if (countDelta !== 0) return countDelta * direction;
    }
    if (sortBy === 'CLASSIFICATION_SCORE') {
      const scoreDelta = (a.classificationSortScore ?? 0) - (b.classificationSortScore ?? 0);
      if (scoreDelta !== 0) return scoreDelta * direction;
    }
    const timeDelta = new Date(a.updatedAtISO).getTime() - new Date(b.updatedAtISO).getTime();
    if (timeDelta !== 0) return timeDelta * direction;
    return a.id.localeCompare(b.id) * direction;
  });
}

function applyFiltersForCategoryCounts(items: InboxThread[], filters?: OpportunityListFilters): InboxThread[] {
  if (!filters) return items;
  const { emailCategory: _emailCategory, ...countFilters } = filters;
  return applyFilters(items, countFilters);
}

function applyFiltersForValueBandCounts(items: InboxThread[], filters?: OpportunityListFilters): InboxThread[] {
  if (!filters) return items;
  const {
    emailCategory: _emailCategory,
    needsAction: _needsAction,
    leadValueBand: _leadValueBand,
    actionTier: _actionTier,
    leadStage: _leadStage,
    ...countFilters
  } = filters;
  return applyFilters(items, countFilters);
}

function opportunityListPath(filters?: OpportunityListFilters, pageOptions?: OpportunityPageOptions): string {
  const base = pageOptions ? '/api/v1/opportunities/page' : '/api/v1/opportunities';
  const params = new URLSearchParams();
  if (filters?.actionTier) params.set('actionTier', filters.actionTier);
  if (filters?.emailCategory) params.set('emailCategory', filters.emailCategory);
  if (filters?.leadStage) params.set('leadStage', filters.leadStage);
  if (filters?.leadValueBand) params.set('leadValueBand', filters.leadValueBand);
  if (filters?.needsAction) params.set('needsAction', 'true');
  if (filters?.timeRange) params.set('timeRange', filters.timeRange);
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortDirection) params.set('sortDirection', filters.sortDirection);
  if (pageOptions) {
    params.set('page', String(pageOptions.page ?? 0));
    params.set('size', String(pageOptions.size ?? 20));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function fetchOpportunityThreads(filters?: OpportunityListFilters): Promise<InboxThread[]> {
  if (!shouldUseBackendApi()) {
    return applySort(applyFilters(await fetchMockInboxThreads(), filters), filters?.sortBy, filters?.sortDirection);
  }
  const items = await apiRequest<OpportunityListItem[]>(opportunityListPath(filters));
  return items.map(mapOpportunityToThread);
}

export async function fetchOpportunityThreadPage(
  filters?: OpportunityListFilters,
  options: OpportunityPageOptions = {}
): Promise<OpportunityThreadPage> {
  const page = options.page ?? 0;
  const size = options.size ?? 20;
  if (!shouldUseBackendApi()) {
    const allItems = await fetchMockInboxThreads();
    const items = applySort(applyFilters(allItems, filters), filters?.sortBy, filters?.sortDirection);
    const start = page * size;
    const countSource = applyFiltersForCategoryCounts(allItems, filters);
    return {
      items: items.slice(start, start + size),
      page,
      size,
      hasMore: start + size < items.length,
      categoryCounts: categoryCountsFromThreads(countSource),
      valueBandCounts: valueBandCountsFromThreads(applyFiltersForValueBandCounts(allItems, filters)),
    };
  }
  const result = await apiRequest<OpportunityListPage>(opportunityListPath(filters, { page, size }));
  return {
    ...result,
    items: result.items.map(mapOpportunityToThread),
    categoryCounts: normalizeCategoryCounts(result.categoryCounts),
    valueBandCounts: normalizeValueBandCounts(result.valueBandCounts),
  };
}

function isNumericDraftId(id: string | undefined): boolean {
  return !!id && /^\d+$/.test(id);
}

async function resolveSuggestedDraftIds(
  threadId: string,
  mapped: InboxThreadDetail
): Promise<InboxThreadDetail> {
  const { aiReply, quote } = mapped.suggestedDraftIds;
  if (isNumericDraftId(aiReply) && isNumericDraftId(quote)) {
    return mapped;
  }
  const drafts = await apiRequest<DraftListItemDto[]>(`/api/v1/drafts?opportunityId=${threadId}`);
  const byKind = (kind: string) => drafts.find((d) => d.kind === kind)?.id;
  return {
    ...mapped,
    suggestedDraftIds: {
      aiReply: isNumericDraftId(aiReply) ? aiReply : (byKind('ai_reply') ?? aiReply),
      quote: isNumericDraftId(quote) ? quote : (byKind('quote') ?? quote),
    },
  };
}

export async function fetchOpportunityThreadDetail(threadId: string): Promise<InboxThreadDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockInboxThreadDetail(threadId);
  }
  const [detail, timeline] = await Promise.all([
    apiRequest<OpportunityDetail>(`/api/v1/opportunities/${threadId}`),
    apiRequest<OpportunityTimeline>(`/api/v1/opportunities/${threadId}/timeline`),
  ]);
  const mapped = mapOpportunityToDetail(detail, timeline);
  return resolveSuggestedDraftIds(threadId, mapped);
}

export { syncMailbox as triggerMailboxSync } from '@/src/api/mailbox-api';
export type { MailSyncResult } from '@/src/api/mailbox-api';

export async function updateOpportunityClassification(
  threadId: string,
  input: { emailCategory: string; leadStage: string }
): Promise<InboxThreadDetail> {
  if (!shouldUseBackendApi()) {
    return fetchOpportunityThreadDetail(threadId);
  }
  const detail = await apiRequest<OpportunityDetail>(`/api/v1/opportunities/${threadId}/classification`, {
    method: 'POST',
    body: input,
  });
  const timeline = await apiRequest<OpportunityTimeline>(`/api/v1/opportunities/${threadId}/timeline`);
  const mapped = mapOpportunityToDetail(detail, timeline);
  return resolveSuggestedDraftIds(threadId, mapped);
}

export async function restoreOpportunityClassification(threadId: string): Promise<InboxThreadDetail> {
  if (!shouldUseBackendApi()) {
    return fetchOpportunityThreadDetail(threadId);
  }
  const detail = await apiRequest<OpportunityDetail>(
    `/api/v1/opportunities/${threadId}/classification/restore`,
    { method: 'POST' }
  );
  const timeline = await apiRequest<OpportunityTimeline>(`/api/v1/opportunities/${threadId}/timeline`);
  const mapped = mapOpportunityToDetail(detail, timeline);
  return resolveSuggestedDraftIds(threadId, mapped);
}

export async function archiveOpportunity(threadId: string): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest(`/api/v1/opportunities/${threadId}/archive`, { method: 'POST' });
}

export async function confirmOpportunityBrief(threadId: string): Promise<BriefView> {
  if (!shouldUseBackendApi()) {
    throw new Error('confirm_brief_requires_backend');
  }
  return apiRequest<BriefView>(`/api/v1/opportunities/${threadId}/brief/confirm`, { method: 'POST' });
}

export async function acknowledgeOpportunityBriefRisks(
  threadId: string,
  riskIds: string[]
): Promise<BriefView> {
  if (!shouldUseBackendApi()) {
    throw new Error('ack_brief_risks_requires_backend');
  }
  return apiRequest<BriefView>(`/api/v1/opportunities/${threadId}/brief/risk-ack`, {
    method: 'POST',
    body: { riskIds },
  });
}
