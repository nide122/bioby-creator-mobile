import { create } from 'zustand';

import i18n from '@/src/i18n';
import type { DecisionCard } from '@/src/types/domain';

export type ResolvedEntry = {
  card: DecisionCard;
  /** 'resolved' = 正常处理，'deferred' = 推迟 */
  disposition: 'resolved' | 'deferred';
  actionLabel: string;
};

type DecisionQueueState = {
  entries: ResolvedEntry[];
  resolve: (card: DecisionCard, actionLabel: string) => void;
  defer: (card: DecisionCard) => void;
  undoLast: () => void;
  reprocessDeferred: () => void;
  clearEntries: () => void;
};

export const useDecisionQueueStore = create<DecisionQueueState>((set) => ({
  entries: [],

  resolve: (card, actionLabel) =>
    set((state) => ({
      entries: [...state.entries, { card, disposition: 'resolved', actionLabel }],
    })),

  defer: (card) =>
    set((state) => ({
      entries: [...state.entries, { card, disposition: 'deferred', actionLabel: i18n.t('today.defer') }],
    })),

  undoLast: () => set((state) => ({ entries: state.entries.slice(0, -1) })),

  reprocessDeferred: () =>
    set((state) => ({
      entries: state.entries.filter((entry) => entry.disposition !== 'deferred'),
    })),

  clearEntries: () => set({ entries: [] }),
}));
