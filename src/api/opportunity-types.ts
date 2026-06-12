/** Backend opportunity DTOs (aligned with OpportunityListItemView / OpportunityDetailView). */
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
  budgetLabel?: string | null;
  riskLabel?: string | null;
  nextActionLabel?: string | null;
  messageCount?: number | null;
  userCorrected?: boolean;
  classificationCorrectedAtISO?: string | null;
};

export type OpportunityListPage = {
  items: OpportunityListItem[];
  page: number;
  size: number;
  hasMore: boolean;
  categoryCounts?: Record<string, number>;
};

export type OpportunityDetail = OpportunityListItem & {
  briefStage?: string;
  ownerLabel?: string | null;
  signals?: string[];
  riskFlags?: unknown;
  recommendedActions?: string[];
  suggestedDraftIds?: { aiReply?: string | null; quote?: string | null } | null;
  extractionStatus?: 'PENDING' | 'COMPLETE' | 'FAILED';
  extractionConfidence?: number | null;
  missingFields?: string[] | unknown;
  deliverables?: string[];
  usageRights?: string[];
  postingSchedule?: string | null;
};

export type OpportunityTimeline = {
  opportunityId: string;
  messages: Array<{
    id?: string;
    sentAtISO?: string;
    fromLabel?: string;
    snippet?: string;
    subject?: string;
  }>;
  events: unknown[];
};
