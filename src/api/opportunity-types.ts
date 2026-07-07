import type { AiProcessingSource, MoneyAmount } from '@/src/types/domain';

import type { PriorityAssessmentView } from '@/src/lib/priority-assessment';

/** Backend opportunity DTOs (aligned with OpportunityListItemView / OpportunityDetailView). */
export type OpportunityMessageStats = {
  total: number;
  received: number;
  sent: number;
  unread: number;
  unreadReceived: number;
  unreadSent: number;
};

export type OpportunityListItem = {
  id: string;
  brandId?: string | null;
  brandName: string;
  claimedBrandName?: string | null;
  subject: string;
  preview: string;
  updatedAtISO: string;
  emailCategory: string;
  actionTier: string;
  actionReasons?: { code: string; message: string }[];
  leadStage: string;
  /** @deprecated Prefer inboxPriority. Kept for legacy clients. */
  leadValueBand?: string;
  classificationSortScore?: number;
  inboxPriority?: 'p0' | 'p1' | 'p2' | 'p3';
  priorityScore?: number | null;
  valueSortKey?: number | null;
  dealEconomics?: PriorityAssessmentView['dealEconomics'];
  priorityAssessment?: PriorityAssessmentView | null;
  priorityBreakdown?: {
    brandFit: number;
    budgetValue: number;
    timelineUrgency: number;
    relationshipValue: number;
    effort: number;
    risk: number;
    rulesVersion?: string | null;
  } | null;
  budgetDisplay?: string | null;
  budgetAmount?: MoneyAmount | null;
  riskLabel?: string | null;
  nextActionLabel?: string | null;
  messageCount?: number | null;
  messageStats?: OpportunityMessageStats | null;
  userCorrected?: boolean;
  classificationCorrectedAtISO?: string | null;
  classificationSource?: AiProcessingSource | null;
  briefExtractionSource?: AiProcessingSource | null;
  budgetFloorRatio?: number | null;
  exceptionalBudget?: boolean | null;
  pipelinePhase?: string | null;
  dealEscrowPhase?: string | null;
  contractRiskPreview?: unknown;
  /** Multi-email thread awaiting thread-level classification backfill. */
  classificationPending?: boolean;
  threadEvaluationAtISO?: string | null;
};

export type OpportunityListPage = {
  items: OpportunityListItem[];
  page: number;
  size: number;
  hasMore: boolean;
  categoryCounts?: Record<string, number>;
  valueBandCounts?: Record<string, number>;
};

export type LatestApprovedScript = {
  title: string;
  excerpt: string;
  sourceEmailMessageId?: string | null;
  confirmedAtISO?: string | null;
  extractionSource?: string | null;
};

export type DeliverableItem = {
  name: string;
  contentFormat?: string | null;
  platform?: string | null;
  quantity?: number;
  dueAtISO?: string | null;
  dueAtKind?: string | null;
  dueAtText?: string | null;
  dueAtUncertainty?: string | null;
  rateCardLineKeys?: string[];
};

export type DeliverablePackage = {
  label?: string | null;
  quoteDisplay?: string | null;
  quoteAmount?: MoneyAmount | null;
  items: DeliverableItem[];
};

export type OpportunityDetail = OpportunityListItem & {
  briefStage?: string;
  dealId?: string | null;
  ownerLabel?: string | null;
  signals?: string[];
  classificationSummary?: string | null;
  classificationSignals?: string[];
  riskFlags?: unknown;
  contractRiskFlags?: unknown;
  attentionFlags?: unknown;
  clearedRiskChecks?: unknown;
  recommendedActions?: string[];
  riskNotes?: string[];
  systemHints?: string[];
  suggestedDraftIds?: { aiReply?: string | null; quote?: string | null } | null;
  extractionStatus?: 'PENDING' | 'COMPLETE' | 'FAILED' | 'SKIPPED';
  extractionConfidence?: number | null;
  missingFields?: string[] | unknown;
  usageRights?: string[];
  deadlineAtISO?: string | null;
  deadlineKind?: string | null;
  deadlineText?: string | null;
  packages?: DeliverablePackage[];
  attentionCount?: number | null;
  contractSummary?: ContractSummaryView | null;
  latestApprovedScript?: LatestApprovedScript | null;
};

export type ContractSummaryView = {
  id?: string | null;
  opportunityId: string;
  status: 'DRAFT' | 'PENDING' | 'COMPLETE' | 'FAILED';
  persisted?: boolean;
  source: 'EMAIL_ATTACHMENT' | 'UPLOAD';
  sourceFilename?: string | null;
  emailAttachmentId?: string | null;
  emailMessageId?: string | null;
  documentType?: DocumentKind | null;
  summary?: string | null;
  deliverables?: string[];
  usageRights?: string[];
  deadlines?: string[];
  riskFlags?: unknown;
  confidence?: number | null;
  extractionSource?: string | null;
  promptVersion?: string | null;
  errorMessage?: string | null;
  createdAtISO?: string;
  updatedAtISO?: string;
};

export type BriefView = {
  opportunityId: string;
  version: number;
  briefStage: string;
  dealId?: string | null;
  confidence?: number | null;
  extractionStatus: string;
  payload?: unknown;
  missingFields?: unknown;
};

export type OpportunityTimeline = {
  opportunityId: string;
  messages: Array<{
    id?: string;
    sentAtISO?: string;
    fromLabel?: string;
    snippet?: string;
    subject?: string;
    direction?: 'inbound' | 'outbound';
    read?: boolean;
  }>;
  events: unknown[];
};
