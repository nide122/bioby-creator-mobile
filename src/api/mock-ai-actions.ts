import type { AiActionLogEntry, InboxEmailCategory } from '@/src/types/domain';
import i18n from '@/src/i18n';
import { MOCK_INBOX_THREAD_DETAILS } from '@/src/api/mock-inbox';
import { DRAFT_DETAILS } from '@/src/api/mock-draft';
import { MOCK_DEALS } from '@/src/api/mock-deals';

type ClassificationCorrection = {
  category: InboxEmailCategory;
  correctedAtISO: string;
};

function inboxCategoryLabel(cat: InboxEmailCategory): string {
  return i18n.t(`labels.inboxCategory.${cat}`);
}

const now = new Date().toISOString();

export function buildMockAiActionLog(corrections: Record<string, ClassificationCorrection>): AiActionLogEntry[] {
  const inboxEntries = Object.values(MOCK_INBOX_THREAD_DETAILS).flatMap((thread): AiActionLogEntry[] => {
    const entries: AiActionLogEntry[] = [
      {
        id: `classified-${thread.id}`,
        kind: 'classified',
        title: i18n.t('mockAiActions.classifiedTitle', { brand: thread.brandName }),
        description: i18n.t('mockAiActions.classifiedBody', {
          category: inboxCategoryLabel(thread.category),
          subject: thread.subject,
        }),
        occurredAtISO: thread.updatedAtISO,
        sourceHref: `/inbox/${thread.id}`,
      },
    ];

    if (thread.category !== 'commercial') {
      entries.push({
        id: `archived-${thread.id}`,
        kind: 'archived',
        title: i18n.t('mockAiActions.archivedTitle', { brand: thread.brandName }),
        description: i18n.t('mockAiActions.archivedBody'),
        occurredAtISO: thread.updatedAtISO,
        sourceHref: `/inbox/${thread.id}`,
      });
    }

    if (thread.riskFlags.length > 0) {
      entries.push({
        id: `risk-${thread.id}`,
        kind: 'risk_flagged',
        title: i18n.t('mockAiActions.riskTitle', { brand: thread.brandName }),
        description: thread.riskFlags.map((flag) => flag.label).join('; '),
        occurredAtISO: thread.updatedAtISO,
        sourceHref: `/inbox/${thread.id}`,
      });
    }

    return entries;
  });

  const draftEntries = Object.values(DRAFT_DETAILS).map((draft): AiActionLogEntry => ({
    id: `drafted-${draft.id}`,
    kind: 'drafted',
    title: i18n.t('mockAiActions.draftedTitle', { title: draft.title }),
    description: draft.requiresApproval ? i18n.t('mockAiActions.draftedNeedsApproval') : i18n.t('mockAiActions.draftedLowRisk'),
    occurredAtISO: draft.updatedAtISO,
    sourceHref: `/drafts/${draft.id}`,
  }));

  const recommendationEntries = MOCK_DEALS.filter((deal) => deal.source === 'recommended').map((deal): AiActionLogEntry => ({
    id: `recommended-${deal.id}`,
    kind: 'recommended',
    title: i18n.t('mockAiActions.recommendedTitle', { brand: deal.brandPlaceholder }),
    description: deal.outcomeSummary ?? i18n.t('mockAiActions.recommendedFallback'),
    occurredAtISO: now,
    sourceHref: `/deal/${deal.id}/packet`,
  }));

  const correctionEntries = Object.entries(corrections).flatMap(([threadId, correction]): AiActionLogEntry[] => {
    const thread = MOCK_INBOX_THREAD_DETAILS[threadId];
    if (!thread) return [];
    return [
      {
        id: `corrected-${threadId}`,
        kind: 'corrected',
        title: i18n.t('mockAiActions.correctedTitle', { brand: thread.brandName }),
        description: i18n.t('mockAiActions.correctedBody', { category: inboxCategoryLabel(correction.category) }),
        occurredAtISO: correction.correctedAtISO,
        sourceHref: `/inbox/${threadId}`,
      },
    ];
  });

  return [...correctionEntries, ...recommendationEntries, ...draftEntries, ...inboxEntries].sort(
    (a, b) => new Date(b.occurredAtISO).getTime() - new Date(a.occurredAtISO).getTime()
  );
}
