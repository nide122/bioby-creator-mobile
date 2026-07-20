import type { InboxThreadDetail } from '@/src/types/domain';

export const PUBLIC_DEMO_ACCOUNT_EMAIL = 'creator.demo@example.com';
export const PUBLIC_DEMO_MAILBOX_EMAIL = 'collabs@example.com';

/** A new sample message revealed after the visitor runs the simulated mailbox sync. */
export function createPublicDemoSyncedThread(): InboxThreadDetail {
  const now = new Date().toISOString();
  return {
    id: 'thread-public-demo-sync',
    subject: 'Summer launch · Short-form creator partnership',
    preview: 'New inquiry: 2 short videos, $3.2k budget, and a two-week delivery window.',
    updatedAtISO: now,
    brandName: 'Northstar Hydration',
    category: 'commercial',
    actionTier: 'DECIDE_NOW',
    leadValueBand: 'high_value',
    inboxPriority: 'p0',
    priorityScore: 86,
    classificationSortScore: 1100,
    pipelinePhase: 'INQUIRY',
    budgetDisplay: '$3,200',
    riskLabel: 'Review usage rights',
    ownerLabel: 'You',
    nextActionLabel: 'inboxPriority.nextAction.replyToday',
    leadStage: 'new',
    signals: ['Budget: $3,200', '2 short-form videos', 'Target delivery: two weeks'],
    riskFlags: [
      {
        id: 'rf-demo-usage',
        label: 'Paid usage term is not specified',
        severity: 'warning',
        hint: 'Confirm platform, territory, and duration before accepting the offer.',
      },
    ],
    recommendedActions: [
      'Confirm the paid usage term and channels.',
      'Ask whether the budget includes exclusivity.',
      'Reply today while the launch window is still open.',
    ],
    suggestedDraftIds: { aiReply: 'draft-reply-01', quote: 'draft-quote-02' },
    messages: [
      {
        id: 'm-public-demo-sync-1',
        sentAtISO: now,
        fromLabel: 'Northstar Hydration · Partnerships',
        direction: 'inbound',
        snippet:
          'We would love to partner on two short-form videos for our summer launch. Our working budget is $3,200 with delivery in two weeks.',
      },
    ],
  };
}

