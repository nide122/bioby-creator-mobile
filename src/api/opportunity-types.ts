import type { AiProcessingSource } from '@/src/types/domain';

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
  brandName: string;
  subject: string;
  preview: string;
  updatedAtISO: string;
  emailCategory: string;
  actionTier: string;
  actionReasons?: { code: string; message: string }[];
  leadStage: string;
  leadValueBand?: string;
  classificationSortScore?: number;
  budgetLabel?: string | null;
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
};

export type OpportunityListPage = {
  items: OpportunityListItem[];
  page: number;
  size: number;
  hasMore: boolean;
  categoryCounts?: Record<string, number>;
  valueBandCounts?: Record<string, number>;
};

export type OpportunityDetail = OpportunityListItem & {
  briefStage?: string;
  dealId?: string | null;
  ownerLabel?: string | null;
  signals?: string[];
  classificationSummary?: string | null;
  classificationSignals?: string[];
  riskFlags?: unknown;
  recommendedActions?: string[];
  suggestedDraftIds?: { aiReply?: string | null; quote?: string | null } | null;
  extractionStatus?: 'PENDING' | 'COMPLETE' | 'FAILED' | 'SKIPPED';
  extractionConfidence?: number | null;
  missingFields?: string[] | unknown;
  deliverables?: string[];
  usageRights?: string[];
  postingSchedule?: string | null;
  packages?: Array<{ deliverable: string; budgetLabel?: string | null; currency?: string | null }>;
  attentionCount?: number | null;
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
