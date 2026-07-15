import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  completeDecision,
  fetchTodayDecisions,
  isServerDecisionId,
  snoozeDecision,
} from '@/src/api/decisions-api';
import { MOCK_INBOX_THREAD_DETAILS } from '@/src/api/mock-inbox';
import { invalidateTenantScopedQueries, useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { useInboxCorrectionStore } from '@/src/stores/inbox-correction-store';
import { useDecisionQueueStore, type ResolvedEntry } from '@/src/stores/decision-queue-store';
import type { DecisionCard } from '@/src/types/domain';

export type { ResolvedEntry };

export function useDecisionQueue() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const apiMode = shouldUseBackendApi();
  const corrections = useInboxCorrectionStore((s) => s.classificationByThreadId);
  const queryKey = useTenantQueryKey('decisions', 'today', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  const query = useQuery({
    queryKey,
    queryFn: fetchTodayDecisions,
    enabled,
  });

  const entries = useDecisionQueueStore((s) => s.entries);
  const resolveLocal = useDecisionQueueStore((s) => s.resolve);
  const deferLocal = useDecisionQueueStore((s) => s.defer);
  const undoLast = useDecisionQueueStore((s) => s.undoLast);
  const reprocessDeferred = useDecisionQueueStore((s) => s.reprocessDeferred);
  const clearEntries = useDecisionQueueStore((s) => s.clearEntries);

  const correctedLeadCards: DecisionCard[] = useMemo(() => {
    if (apiMode) return [];
    return Object.keys(corrections)
      .filter((threadId) => corrections[threadId]?.category === 'commercial')
      .map((threadId) => MOCK_INBOX_THREAD_DETAILS[threadId])
      .filter((thread) => !!thread)
      .map((thread) => ({
        id: `dec-corrected-${thread.id}`,
        category: 'approval' as const,
        entityName: thread.brandName,
        claimedBrandName: thread.claimedBrandName,
        headline: t('decisionsGenerated.correctedLead.headline'),
        aiNote: t('decisionsGenerated.correctedLead.aiNote'),
        sourceHint: t('decisionsGenerated.correctedLead.sourceHint', { subject: thread.subject }),
        sourceHref: `/inbox/${thread.id}`,
        estimatedMinutes: 5,
        actions: [
          {
            id: 'open',
            label: t('decisionsGenerated.correctedLead.openMail'),
            style: 'primary' as const,
            href: `/inbox/${thread.id}`,
          },
          { id: 'later', label: t('decisionsGenerated.correctedLead.later'), style: 'ghost' as const },
        ],
      }));
  }, [apiMode, corrections, t]);

  const allCards = useMemo(
    () => [...correctedLeadCards, ...(query.data?.cards ?? [])],
    [correctedLeadCards, query.data?.cards]
  );

  const handledIds = useMemo(() => new Set(entries.map((e) => e.card.id)), [entries]);
  const pending = useMemo(() => allCards.filter((c) => !handledIds.has(c.id)), [allCards, handledIds]);

  const pendingEstimatedMinutes = useMemo(
    () => pending.reduce((sum, card) => sum + (card.estimatedMinutes ?? 0), 0),
    [pending]
  );

  const deferred = useMemo(() => entries.filter((e) => e.disposition === 'deferred').map((e) => e.card), [entries]);
  const resolvedCount = useMemo(() => entries.filter((e) => e.disposition === 'resolved').length, [entries]);
  const totalCount = allCards.length;
  const lastEntry = entries[entries.length - 1] ?? null;

  const reset = useCallback(() => {
    clearEntries();
    void invalidateTenantScopedQueries(queryClient);
  }, [clearEntries, queryClient]);

  const resolve = useCallback(
    (card: DecisionCard, actionLabel: string) => {
      resolveLocal(card, actionLabel);
      if (apiMode && isServerDecisionId(card.id)) {
        void completeDecision(card.id).then(() => invalidateTenantScopedQueries(queryClient));
      }
    },
    [apiMode, queryClient, resolveLocal]
  );

  const defer = useCallback(
    (card: DecisionCard) => {
      deferLocal(card);
      if (apiMode && isServerDecisionId(card.id)) {
        void snoozeDecision(card.id).then(() => invalidateTenantScopedQueries(queryClient));
      }
    },
    [apiMode, deferLocal, queryClient]
  );

  const aiHandledToday = useMemo(() => {
    if (!apiMode) {
      return [];
    }
    const minutes = query.data?.totalEstimatedMinutes ?? 0;
    if (minutes <= 0) return [];
    return [t('today.apiHandledSummary', { minutes, defaultValue: `AI estimated ~${minutes} min of decisions today.` })];
  }, [apiMode, query.data?.totalEstimatedMinutes, t]);

  return {
    isPending: query.isPending,
    error: query.error,
    pending,
    current: pending[0] ?? null,
    totalCount,
    resolvedCount,
    isDone: !query.isPending && pending.length === 0,
    deferred,
    lastEntry,
    resolve,
    defer,
    undoLast,
    reprocessDeferred,
    reset,
    aiHandledToday,
    totalEstimatedMinutes: query.data?.totalEstimatedMinutes,
    pendingEstimatedMinutes,
    hiddenOpportunityCount: query.data?.hiddenOpportunityCount ?? 0,
  };
}
