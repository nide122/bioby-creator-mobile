import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { OpportunityDetail, OpportunityListItem, OpportunityTimeline } from '@/src/api/opportunity-types';
import type {
  ContractSummary,
  EscrowLifecyclePhase,
  InboxEmailCategory,
  InboxLeadStage,
  InboxMessage,
  InboxMessageDirection,
  InboxMessageStats,
  InboxPriority,
  InboxRiskFlag,
  InboxThread,
  InboxThreadDetail,
  LeadValueBand,
  MoneyAmount,
  OpportunityPipelinePhase,
  PriorityBreakdown,
  RiskClearedCheck,
} from '@/src/types/domain';
import type { PriorityAssessmentView } from '@/src/lib/priority-assessment';

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

export function asInboxPriority(value?: string | null): InboxPriority | undefined {
  if (value === 'p0' || value === 'p1' || value === 'p2' || value === 'p3') {
    return value;
  }
  return undefined;
}

function mapPriorityBreakdown(raw: OpportunityListItem['priorityBreakdown']): PriorityBreakdown | undefined {
  if (!raw) return undefined;
  return {
    brandFit: raw.brandFit,
    budgetValue: raw.budgetValue,
    timelineUrgency: raw.timelineUrgency,
    relationshipValue: raw.relationshipValue,
    effort: raw.effort,
    risk: raw.risk,
    rulesVersion: raw.rulesVersion ?? undefined,
  };
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

function mapMoneyAmount(raw: MoneyAmount | null | undefined): MoneyAmount | undefined {
  if (!raw || raw.amount == null || !raw.currency) return undefined;
  const amount = typeof raw.amount === 'number' ? raw.amount : Number(raw.amount);
  if (Number.isNaN(amount)) return undefined;
  return { amount, currency: String(raw.currency) };
}

function mapPriorityAssessment(raw: PriorityAssessmentView | null | undefined): PriorityAssessmentView | undefined {
  if (!raw) return undefined;
  return raw;
}

export function mapOpportunityToThread(item: OpportunityListItem): InboxThread {
  return {
    id: item.id,
    brandId: item.brandId ?? undefined,
    subject: item.subject,
    preview: item.preview,
    updatedAtISO: item.updatedAtISO,
    brandName: item.brandName,
    claimedBrandName: item.claimedBrandName ?? undefined,
    category: asEmailCategory(item.emailCategory),
    actionTier: item.actionTier as InboxThread['actionTier'],
    leadValueBand: asLeadValueBand(item.leadValueBand),
    inboxPriority: asInboxPriority(item.inboxPriority),
    priorityScore: item.priorityScore ?? undefined,
    valueSortKey: item.valueSortKey ?? undefined,
    dealEconomics: item.dealEconomics ?? undefined,
    priorityAssessment: mapPriorityAssessment(item.priorityAssessment),
    priorityBreakdown: mapPriorityBreakdown(item.priorityBreakdown),
    classificationSortScore: item.classificationSortScore,
    actionReasons: item.actionReasons,
    budgetDisplay: item.budgetDisplay ?? undefined,
    budgetAmount: mapMoneyAmount(item.budgetAmount ?? undefined),
    riskLabel: item.riskLabel ?? undefined,
    contractRiskPreview: parseRiskFlag(item.contractRiskPreview),
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
    classificationPending: item.classificationPending ?? false,
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

function parseRiskFlag(raw: unknown): InboxRiskFlag | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const item = raw as Record<string, unknown>;
  const id = String(item.id ?? '');
  if (!id) return undefined;
  return {
    id,
    label: String(item.label ?? ''),
    severity: (['info', 'warning', 'danger'].includes(String(item.severity))
      ? String(item.severity)
      : 'info') as InboxRiskFlag['severity'],
    code: item.code != null ? String(item.code) : undefined,
    kind:
      item.kind === 'contract' || item.kind === 'attention'
        ? item.kind
        : undefined,
    hint: item.hint != null ? String(item.hint) : undefined,
    acknowledged: item.acknowledged === true,
  };
}

export function parseRiskFlags(raw: unknown): InboxRiskFlag[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => parseRiskFlag(item))
    .filter((flag): flag is InboxRiskFlag => flag != null);
}

function parseClearedCheck(item: unknown): RiskClearedCheck | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const code = record.code != null ? String(record.code).trim() : '';
  const label = record.label != null ? String(record.label).trim() : '';
  if (!code || !label) return null;
  return {
    code,
    label,
    detail: record.detail != null ? String(record.detail) : undefined,
  };
}

export function parseClearedRiskChecks(raw: unknown): RiskClearedCheck[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => parseClearedCheck(item))
    .filter((check): check is RiskClearedCheck => check != null);
}

function mapContractSummary(raw: OpportunityDetail['contractSummary']): ContractSummary | undefined {
  if (!raw) return undefined;
  return {
    id: raw.id ?? undefined,
    opportunityId: raw.opportunityId,
    status: raw.status,
    source: raw.source,
    sourceFilename: raw.sourceFilename ?? undefined,
    emailAttachmentId: raw.emailAttachmentId ?? undefined,
    emailMessageId: raw.emailMessageId ?? undefined,
    documentType: raw.documentType ?? undefined,
    summary: raw.summary ?? undefined,
    deliverables: raw.deliverables ?? [],
    usageRights: raw.usageRights ?? [],
    deadlines: raw.deadlines ?? [],
    riskFlags: parseRiskFlags(raw.riskFlags),
    confidence: raw.confidence ?? undefined,
    extractionSource: raw.extractionSource ?? undefined,
    promptVersion: raw.promptVersion ?? undefined,
    persisted: raw.persisted ?? raw.status === 'COMPLETE',
    errorMessage: raw.errorMessage ?? undefined,
    createdAtISO: raw.createdAtISO,
    updatedAtISO: raw.updatedAtISO,
  };
}

export function mapOpportunityToDetail(detail: OpportunityDetail, timeline?: OpportunityTimeline): InboxThreadDetail {
  const riskFlags = parseRiskFlags(detail.riskFlags);
  const contractRiskFlags = parseRiskFlags(detail.contractRiskFlags);
  const attentionFlags = parseRiskFlags(detail.attentionFlags);
  const clearedRiskChecks = parseClearedRiskChecks(detail.clearedRiskChecks);
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
    contractRiskFlags: contractRiskFlags.length > 0 ? contractRiskFlags : undefined,
    attentionFlags: attentionFlags.length > 0 ? attentionFlags : undefined,
    clearedRiskChecks: clearedRiskChecks.length > 0 ? clearedRiskChecks : undefined,
    recommendedActions: detail.recommendedActions ?? [],
    riskNotes: detail.riskNotes ?? [],
    systemHints: detail.systemHints ?? [],
    extractionStatus: detail.extractionStatus,
    extractionConfidence: detail.extractionConfidence ?? undefined,
    missingFields,
    usageRights: detail.usageRights ?? [],
    deadlineAtISO: detail.deadlineAtISO ?? undefined,
    deadlineKind: detail.deadlineKind ?? undefined,
    deadlineText: detail.deadlineText ?? undefined,
    packages: (detail.packages ?? []).map((pkg) => ({
      label: pkg.label ?? undefined,
      quoteDisplay: pkg.quoteDisplay ?? undefined,
      quoteAmount: mapMoneyAmount(pkg.quoteAmount ?? undefined),
      items: (pkg.items ?? []).map((item) => ({
        name: item.name,
        contentFormat: item.contentFormat ?? undefined,
        platform: item.platform ?? undefined,
        quantity: item.quantity ?? 1,
        dueAtISO: item.dueAtISO ?? undefined,
        dueAtKind: item.dueAtKind ?? undefined,
        dueAtText: item.dueAtText ?? undefined,
        dueAtUncertainty: item.dueAtUncertainty ?? undefined,
        rateCardLineKeys: item.rateCardLineKeys ?? undefined,
      })),
    })),
    attentionCount: detail.attentionCount ?? undefined,
    classificationSource: detail.classificationSource ?? undefined,
    briefExtractionSource: detail.briefExtractionSource ?? undefined,
    contractSummary: mapContractSummary(detail.contractSummary),
    latestApprovedScript: detail.latestApprovedScript ?? undefined,
    suggestedDraftIds: {
      aiReply: suggested.aiReply ?? (shouldUseBackendApi() ? '' : mockFallback.aiReply),
      quote: suggested.quote ?? (shouldUseBackendApi() ? '' : mockFallback.quote),
    },
  };
}
