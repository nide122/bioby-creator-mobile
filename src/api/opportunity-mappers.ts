import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { OpportunityDetail, OpportunityListItem, OpportunityTimeline } from '@/src/api/opportunity-types';
import type {
  EscrowLifecyclePhase,
  InboxEmailCategory,
  InboxLeadStage,
  InboxMessage,
  InboxMessageDirection,
  InboxRiskFlag,
  InboxThread,
  InboxThreadDetail,
  LeadValueBand,
  OpportunityPipelinePhase,
} from '@/src/types/domain';

const EMAIL_CATEGORIES: InboxEmailCategory[] = ['commercial', 'pr_sample', 'media', 'personal', 'spam', 'other'];
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

export function asLeadValueBand(value?: string | null): LeadValueBand | undefined {
  if (value === 'high_value' || value === 'needs_negotiation' || value === 'archived') {
    return value;
  }
  return undefined;
}

function asPipelinePhase(value?: string | null): OpportunityPipelinePhase | undefined {
  const phases: OpportunityPipelinePhase[] = [
    'INQUIRY',
    'NEGOTIATION',
    'CONTRACTED',
    'PRODUCTION',
    'BRAND_REVIEW',
    'REVISION',
    'SCHEDULED',
    'LIVE',
    'INVOICING',
    'CLOSED',
  ];
  return phases.includes(value as OpportunityPipelinePhase) ? (value as OpportunityPipelinePhase) : undefined;
}

function asEscrowPhase(value?: string | null): EscrowLifecyclePhase | undefined {
  const phases: EscrowLifecyclePhase[] = [
    'awaiting_prepay',
    'escrowed',
    'in_execution',
    'pending_verification',
    'settled',
    'remediation',
    'disputed',
  ];
  return phases.includes(value as EscrowLifecyclePhase) ? (value as EscrowLifecyclePhase) : undefined;
}

function mapMessageStats(raw: OpportunityListItem['messageStats']): InboxMessageStats | undefined {
  if (!raw) return undefined;
  return {
    total: raw.total,
    received: raw.received,
    sent: raw.sent,
    unread: raw.unread,
    unreadReceived: raw.unreadReceived,
    unreadSent: raw.unreadSent,
  };
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
    leadValueBand: asLeadValueBand(item.leadValueBand),
    classificationSortScore: item.classificationSortScore,
    actionReasons: item.actionReasons,
    budgetLabel: item.budgetLabel ?? undefined,
    riskLabel: item.riskLabel ?? undefined,
    nextActionLabel: item.nextActionLabel ?? undefined,
    messageCount: item.messageCount ?? 1,
    messageStats: mapMessageStats(item.messageStats),
    leadStage: asLeadStage(item.leadStage),
    signals: [],
    userCorrected: item.userCorrected ?? false,
    classificationCorrectedAtISO: item.classificationCorrectedAtISO ?? undefined,
    classificationSource: item.classificationSource ?? undefined,
    briefExtractionSource: item.briefExtractionSource ?? undefined,
    budgetFloorRatio: item.budgetFloorRatio ?? undefined,
    exceptionalBudget: item.exceptionalBudget ?? undefined,
    pipelinePhase: asPipelinePhase(item.pipelinePhase),
    dealEscrowPhase: asEscrowPhase(item.dealEscrowPhase),
  };
}

function asMessageDirection(value?: string): InboxMessageDirection | undefined {
  return value === 'inbound' || value === 'outbound' ? value : undefined;
}

function inferMessageDirection(fromLabel: string | undefined): InboxMessageDirection | undefined {
  if (!fromLabel) return undefined;
  const normalized = fromLabel.trim().toLowerCase();
  if (normalized.startsWith('you') || normalized.startsWith('你')) {
    return 'outbound';
  }
  return undefined;
}

function parseRiskFlags(raw: unknown): InboxRiskFlag[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? ''),
      label: String(item.label ?? ''),
      severity: (['info', 'warning', 'danger'].includes(String(item.severity))
        ? String(item.severity)
        : 'info') as InboxRiskFlag['severity'],
      hint: item.hint != null ? String(item.hint) : undefined,
      acknowledged: item.acknowledged === true,
    }))
    .filter((flag) => flag.id.length > 0);
}

export function mapOpportunityToDetail(detail: OpportunityDetail, timeline?: OpportunityTimeline): InboxThreadDetail {
  const riskFlags = parseRiskFlags(detail.riskFlags);
  const messages: InboxMessage[] = (timeline?.messages ?? []).map((m, index) => ({
    id: m.id ?? `m${index}`,
    sentAtISO: m.sentAtISO ?? detail.updatedAtISO,
    fromLabel: m.fromLabel ?? detail.brandName,
    snippet: m.snippet ?? '',
    subject: m.subject ?? detail.subject,
    direction: asMessageDirection(m.direction) ?? inferMessageDirection(m.fromLabel),
    read: m.read,
  }));
  const suggested = parseSuggestedDraftIds(detail.suggestedDraftIds);
  const mockFallback = mockDraftFallback();
  const missingFields = Array.isArray(detail.missingFields)
    ? detail.missingFields.map(String)
    : [];
  return {
    ...mapOpportunityToThread(detail),
    briefStage: detail.briefStage,
    dealId: detail.dealId ?? undefined,
    ownerLabel: detail.ownerLabel ?? undefined,
    signals: detail.signals ?? [],
    classificationSummary: detail.classificationSummary ?? undefined,
    classificationSignals: detail.classificationSignals ?? [],
    messages,
    riskFlags,
    recommendedActions: detail.recommendedActions ?? [],
    extractionStatus: detail.extractionStatus,
    extractionConfidence: detail.extractionConfidence ?? undefined,
    missingFields,
    deliverables: detail.deliverables ?? [],
    usageRights: detail.usageRights ?? [],
    postingSchedule: detail.postingSchedule ?? undefined,
    packages: detail.packages ?? [],
    attentionCount: detail.attentionCount ?? undefined,
    classificationSource: detail.classificationSource ?? undefined,
    briefExtractionSource: detail.briefExtractionSource ?? undefined,
    suggestedDraftIds: {
      aiReply: suggested.aiReply ?? (shouldUseBackendApi() ? '' : mockFallback.aiReply),
      quote: suggested.quote ?? (shouldUseBackendApi() ? '' : mockFallback.quote),
    },
  };
}
