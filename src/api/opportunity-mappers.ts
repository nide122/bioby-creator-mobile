import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { OpportunityDetail, OpportunityListItem, OpportunityTimeline } from '@/src/api/opportunity-types';
import type {
  InboxEmailCategory,
  InboxLeadStage,
  InboxMessage,
  InboxRiskFlag,
  InboxThread,
  InboxThreadDetail,
} from '@/src/types/domain';

const EMAIL_CATEGORIES: InboxEmailCategory[] = ['commercial', 'pr_sample', 'media', 'personal', 'other'];
const LEAD_STAGES: InboxLeadStage[] = ['new', 'needs_reply', 'draft_ready', 'quoted', 'negotiating'];

function asEmailCategory(value: string): InboxEmailCategory {
  return EMAIL_CATEGORIES.includes(value as InboxEmailCategory) ? (value as InboxEmailCategory) : 'other';
}

function asLeadStage(value: string): InboxLeadStage {
  return LEAD_STAGES.includes(value as InboxLeadStage) ? (value as InboxLeadStage) : 'new';
}

function parseSuggestedDraftIds(raw: OpportunityDetail['suggestedDraftIds']): {
  aiReply?: string;
  quote?: string;
} {
  if (!raw || typeof raw !== 'object') return {};
  const aiReply = raw.aiReply != null ? String(raw.aiReply) : undefined;
  const quote = raw.quote != null ? String(raw.quote) : undefined;
  return { aiReply, quote };
}

function mockDraftFallback(): { aiReply: string; quote: string } {
  return { aiReply: 'draft-reply-01', quote: 'draft-quote-02' };
}

export function mapOpportunityToThread(item: OpportunityListItem): InboxThread {
  return {
    id: item.id,
    subject: item.subject,
    preview: item.preview,
    updatedAtISO: item.updatedAtISO,
    brandName: item.brandName,
    category: asEmailCategory(item.emailCategory),
    actionTier: item.actionTier as InboxThread['actionTier'],
    actionReasons: item.actionReasons,
    budgetLabel: item.budgetLabel ?? undefined,
    riskLabel: item.riskLabel ?? undefined,
    nextActionLabel: item.nextActionLabel ?? undefined,
    messageCount: item.messageCount ?? 1,
    leadStage: asLeadStage(item.leadStage),
    signals: [],
    userCorrected: item.userCorrected ?? false,
    classificationCorrectedAtISO: item.classificationCorrectedAtISO ?? undefined,
  };
}

export function mapOpportunityToDetail(detail: OpportunityDetail, timeline?: OpportunityTimeline): InboxThreadDetail {
  const riskFlags = Array.isArray(detail.riskFlags)
    ? (detail.riskFlags as InboxRiskFlag[])
    : [];
  const messages: InboxMessage[] = (timeline?.messages ?? []).map((m, index) => ({
    id: m.id ?? `m${index}`,
    sentAtISO: m.sentAtISO ?? detail.updatedAtISO,
    fromLabel: m.fromLabel ?? detail.brandName,
    snippet: m.snippet ?? '',
    subject: m.subject ?? detail.subject,
  }));
  const suggested = parseSuggestedDraftIds(detail.suggestedDraftIds);
  const mockFallback = mockDraftFallback();
  const missingFields = Array.isArray(detail.missingFields)
    ? detail.missingFields.map(String)
    : [];
  return {
    ...mapOpportunityToThread(detail),
    ownerLabel: detail.ownerLabel ?? undefined,
    signals: detail.signals ?? [],
    messages,
    riskFlags,
    recommendedActions: detail.recommendedActions ?? [],
    extractionStatus: detail.extractionStatus,
    extractionConfidence: detail.extractionConfidence ?? undefined,
    missingFields,
    deliverables: detail.deliverables ?? [],
    usageRights: detail.usageRights ?? [],
    postingSchedule: detail.postingSchedule ?? undefined,
    suggestedDraftIds: {
      aiReply: suggested.aiReply ?? (shouldUseBackendApi() ? '' : mockFallback.aiReply),
      quote: suggested.quote ?? (shouldUseBackendApi() ? '' : mockFallback.quote),
    },
  };
}
