import { MOCK_DEAL_OPPORTUNITY_THREADS } from '@/src/data/mock-deal-catalog';
import type { InboxThread, InboxThreadDetail } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';
import { isTodayIso } from '@/src/lib/is-today-iso';
import { isOpportunityNeedsAction } from '@/src/lib/opportunity-needs-action';
import { partitionRiskFlags } from '@/src/lib/contract-warning';

const now = new Date().toISOString();

const MOCK_INBOX_THREAD_DETAILS_BASE: Record<string, InboxThreadDetail> = {
  'thread-skincare': {
    id: 'thread-skincare',
    subject: '2 short videos | Claims need pre-review',
    preview:
      'Budget signal is $2.8k-$4.5k. Includes #ad disclosure and a 48h review window.',
    updatedAtISO: now,
    brandName: 'ClearSkin Lab',
    category: 'commercial',
    actionTier: 'DEVELOP',
    leadValueBand: 'high_value',
    inboxPriority: 'p1',
    priorityScore: 72,
    priorityBreakdown: {
      brandFit: 24,
      budgetValue: 28,
      timelineUrgency: 10,
      relationshipValue: 0,
      effort: 5,
      risk: 0,
    },
    classificationSortScore: 920,
    pipelinePhase: 'INQUIRY',
    budgetLabel: '$2.8k – $4.5k',
    riskLabel: 'Medium risk · Claims review',
    ownerLabel: 'You',
    nextActionLabel: 'inboxPriority.nextAction.sendQuote',
    leadStage: 'draft_ready',
    signals: ['Disclosure: #ad + pinned comment', 'Script revisions capped at 2 rounds', 'Target publish: May 25'],
    riskFlags: [
      {
        id: 'rf-claims',
        label: 'Claims may need pre-review',
        severity: 'warning',
        hint: 'Add a compliance review window and responsibility boundary.',
      },
      {
        id: 'rf-window',
        label: '48h feedback window is tight',
        severity: 'info',
        hint: 'Add buffer before committing publish timing.',
      },
    ],
    recommendedActions: [
      'Clarify revision rounds and deliverable format.',
      'Ask whether prepay and release milestones are part of the deal.',
      'If usage expands beyond the campaign, quote it separately.',
    ],
    suggestedDraftIds: { aiReply: 'draft-reply-01', quote: 'draft-quote-02' },
    messages: [
      {
        id: 'm1',
        sentAtISO: now,
        fromLabel: 'ClearSkin Lab · Brief',
        direction: 'inbound',
        snippet:
          'We are looking for two short videos around barrier repair. Budget is roughly $2.8k-$4.5k and #ad must appear in caption and pinned comment.',
      },
      {
        id: 'm2',
        sentAtISO: now,
        fromLabel: 'You · Follow-up',
        direction: 'outbound',
        snippet: 'Thanks for the brief. Please confirm whether claims need legal review and how many script revision rounds are included.',
      },
    ],
  },
  'thread-hardware': {
    id: 'thread-hardware',
    subject: 'Outdoor gear · long-term usage ask',
    preview:
      'Brand wants long-run usage plus remix edits; budget and prepay are still unclear.',
    updatedAtISO: now,
    brandName: 'TrailPeak Gear',
    category: 'commercial',
    actionTier: 'DECIDE_NOW',
    leadValueBand: 'needs_negotiation',
    inboxPriority: 'p0',
    priorityScore: 68,
    priorityBreakdown: {
      brandFit: 15,
      budgetValue: 8,
      timelineUrgency: 30,
      relationshipValue: 15,
      effort: 10,
      risk: 15,
    },
    classificationSortScore: 780,
    budgetLabel: 'Budget unclear',
    riskLabel: 'High risk · Broad usage',
    ownerLabel: 'You',
    nextActionLabel: 'inboxPriority.nextAction.replyToday',
    leadStage: 'negotiating',
    pipelinePhase: 'NEGOTIATION',
    signals: ['Broad usage scope', 'Brand typically replies within 36h'],
    riskFlags: [
      {
        id: 'rf-license',
        label: 'Long-term use + remix edits',
        severity: 'danger',
        hint: 'Split pricing by placement, territory, platform, and remix—avoid one fee covering everything.',
      },
      {
        id: 'rf-prepay',
        label: 'Prepay not locked',
        severity: 'warning',
        hint: 'Avoid committing shoot or publish dates before prepay is confirmed.',
      },
    ],
    recommendedActions: [
      'Split base deliverables, long-term usage, and remix edits into separate line items.',
      'Do not promise dates until prepay is locked—you avoid unpaid production risk.',
      'Brand mentioned year-round push, remix, and paid social edits without confirmed budget/prepay.',
    ],
    suggestedDraftIds: { aiReply: 'draft-reply-01', quote: 'draft-quote-02' },
    messages: [
      {
        id: 'm1',
        sentAtISO: now,
        fromLabel: 'TrailPeak Gear · Partnership',
        direction: 'inbound',
        snippet:
          'We are planning a year-round camping light push and may need remix and paid social edit rights. Please share your rate structure.',
      },
      {
        id: 'm2',
        sentAtISO: now,
        fromLabel: 'AI summary',
        direction: 'inbound',
        snippet:
          'Negotiating; budget still open. Ask about prepay first and quote base delivery, long-term usage, and remix edits separately.',
      },
    ],
  },
  'thread-pr-sample': {
    id: 'thread-pr-sample',
    subject: 'Free product gift · No paid partnership',
    preview: 'We\'d love to send you our new sunscreen range to try. No obligations.',
    updatedAtISO: now,
    brandName: 'Solara Beauty',
    category: 'pr_sample',
    actionTier: 'AUTO_HANDLED',
    leadValueBand: 'archived',
    inboxPriority: 'p2',
    priorityScore: 18,
    leadStage: 'new',
    nextActionLabel: 'inboxPriority.nextAction.reviewWhenFree',
    signals: [],
    riskFlags: [],
    recommendedActions: [],
    suggestedDraftIds: { aiReply: 'draft-reply-01', quote: 'draft-quote-02' },
    messages: [
      {
        id: 'm1',
        sentAtISO: now,
        fromLabel: 'Solara Beauty · PR',
        snippet: 'Hi! We\'d love to gift you our new SPF collection. No paid partnership required, just organic content if you enjoy it.',
      },
    ],
  },
  'thread-media': {
    id: 'thread-media',
    subject: 'Interview request for creator economy feature',
    preview: 'Online magazine wants a 20-min interview for their Q3 creator spotlight.',
    updatedAtISO: now,
    brandName: 'CreatorDaily Mag',
    category: 'media',
    actionTier: 'AUTO_HANDLED',
    leadValueBand: 'archived',
    inboxPriority: 'p2',
    priorityScore: 20,
    leadStage: 'new',
    nextActionLabel: 'inboxPriority.nextAction.reviewWhenFree',
    signals: [],
    riskFlags: [],
    recommendedActions: [],
    suggestedDraftIds: { aiReply: 'draft-reply-01', quote: 'draft-quote-02' },
    messages: [
      {
        id: 'm1',
        sentAtISO: now,
        fromLabel: 'CreatorDaily · Editor',
        snippet: 'We\'re running a creator economy feature next month and would love a quick 20-min interview. No fee, but great exposure.',
      },
    ],
  },
  'thread-spam': {
    id: 'thread-spam',
    subject: 'Limited offer · Act now for 50% off',
    preview: 'Bulk marketing blast with no brand fit or budget details.',
    updatedAtISO: now,
    brandName: 'PromoBlast Inc',
    category: 'spam',
    actionTier: 'AUTO_HANDLED',
    leadValueBand: 'archived',
    inboxPriority: 'p3',
    priorityScore: 5,
    leadStage: 'new',
    nextActionLabel: undefined,
    signals: [],
    riskFlags: [],
    recommendedActions: [],
    suggestedDraftIds: { aiReply: 'draft-reply-01', quote: 'draft-quote-02' },
    messages: [
      {
        id: 'm1',
        sentAtISO: now,
        fromLabel: 'PromoBlast · Marketing',
        snippet: 'Exclusive influencer discount — click here to unlock your special rate before midnight!',
      },
    ],
  },
};

/** Single source of truth: active inbox threads + contracted opportunities with deals. */
export const MOCK_INBOX_THREAD_DETAILS: Record<string, InboxThreadDetail> = {
  ...MOCK_INBOX_THREAD_DETAILS_BASE,
  ...MOCK_DEAL_OPPORTUNITY_THREADS,
};

function threadSummaryFromDetail(detail: InboxThreadDetail): InboxThread {
  const { messages: _m, riskFlags, recommendedActions: _a, suggestedDraftIds: _s, ...rest } = detail;
  const { contractRisks } = partitionRiskFlags(riskFlags, {
    budgetLabel: rest.budgetLabel,
    usageRights: detail.usageRights,
    deliverables: detail.deliverables,
    packages: detail.packages,
    leadStage: rest.leadStage,
  });
  const primary =
    contractRisks.find((flag) => flag.severity === 'danger') ??
    contractRisks.find((flag) => flag.severity === 'warning') ??
    contractRisks[0];
  return {
    ...rest,
    contractRiskPreview: primary,
    messageCount: rest.messageCount ?? detail.messages.length,
  };
}

export async function fetchMockInboxThreads(options?: { empty?: boolean }): Promise<InboxThread[]> {
  await mockDelay(250);
  if (options?.empty) return [];
  return Object.values(MOCK_INBOX_THREAD_DETAILS).map(threadSummaryFromDetail);
}

export async function fetchMockInboxThreadDetail(threadId: string): Promise<InboxThreadDetail> {
  await mockDelay(200);
  const detail = MOCK_INBOX_THREAD_DETAILS[threadId];
  if (!detail) {
    throw new Error(`inbox_thread_not_found:${threadId}`);
  }
  return detail;
}

export function getMockInboxThreadBrandHint(threadId: string): string | undefined {
  return MOCK_INBOX_THREAD_DETAILS[threadId]?.brandName;
}

export function getMockInboxThreadReplyContext(threadId: string) {
  const detail = MOCK_INBOX_THREAD_DETAILS[threadId];
  if (!detail) return undefined;
  return {
    brandName: detail.brandName,
    cooperationTitle: detail.subject,
    budgetLabel: detail.budgetLabel,
    deliverables: detail.deliverables?.length ? detail.deliverables.join(', ') : undefined,
    postingSchedule: detail.postingSchedule,
  };
}

/** AI 今日处理摘要（mock，未来由后端推送） */
export async function fetchMockAiDailySummary(): Promise<{
  processedCount: number;
  commercialCount: number;
  needsActionCount: number;
  archivedCount: number;
}> {
  await mockDelay(100);
  const threads = Object.values(MOCK_INBOX_THREAD_DETAILS).filter((thread) =>
    isTodayIso(thread.updatedAtISO),
  );
  const processedCount = threads.reduce(
    (sum, thread) => sum + (thread.messageCount ?? thread.messages.length ?? 1),
    0,
  );
  return {
    processedCount,
    commercialCount: threads.filter((t) => t.category === 'commercial').length,
    needsActionCount: threads.filter((t) => isOpportunityNeedsAction(t)).length,
    archivedCount: threads.filter((t) => t.leadValueBand === 'archived').length,
  };
}
