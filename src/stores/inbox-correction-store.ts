import { create } from 'zustand';

import i18n from '@/src/i18n';
import type { InboxEmailCategory, InboxPriority, InboxThread, InboxThreadDetail } from '@/src/types/domain';

type ClassificationCorrection = {
  category: InboxEmailCategory;
  correctedAtISO: string;
};

type InboxCorrectionState = {
  classificationByThreadId: Record<string, ClassificationCorrection>;
  setCategory: (thread: Pick<InboxThread, 'id'>, category: InboxEmailCategory) => void;
  markAsCommercial: (thread: Pick<InboxThread, 'id'>) => void;
  clearCorrection: (threadId: string) => void;
  clearAllCorrections: () => void;
};

export const useInboxCorrectionStore = create<InboxCorrectionState>((set) => ({
  classificationByThreadId: {},
  setCategory: (thread, category) =>
    set((state) => ({
      classificationByThreadId: {
        ...state.classificationByThreadId,
        [thread.id]: { category, correctedAtISO: new Date().toISOString() },
      },
    })),
  markAsCommercial: (thread) =>
    set((state) => ({
      classificationByThreadId: {
        ...state.classificationByThreadId,
        [thread.id]: { category: 'commercial', correctedAtISO: new Date().toISOString() },
      },
    })),
  clearCorrection: (threadId) =>
    set((state) => {
      const next = { ...state.classificationByThreadId };
      delete next[threadId];
      return { classificationByThreadId: next };
    }),
  clearAllCorrections: () => set({ classificationByThreadId: {} }),
}));

function priorityForCorrectedCategory(category: InboxEmailCategory): InboxPriority | undefined {
  if (category === 'spam' || category === 'personal' || category === 'other') {
    return 'p3';
  }
  if (category === 'commercial' || category === 'pr_sample' || category === 'media') {
    return 'p2';
  }
  return undefined;
}

export function applyInboxClassificationCorrection<T extends InboxThread>(
  thread: T,
  corrections: Record<string, ClassificationCorrection>
): T {
  const correction = corrections[thread.id];
  if (!correction) return thread;
  const correctedAsCommercial = correction.category === 'commercial';
  const correctedPriority = priorityForCorrectedCategory(correction.category);

  return {
    ...thread,
    category: correction.category,
    leadStage: correctedAsCommercial && thread.leadStage === 'new' ? 'needs_reply' : thread.leadStage,
    budgetLabel: correctedAsCommercial ? (thread.budgetLabel ?? 'Budget unclear') : undefined,
    riskLabel: correctedAsCommercial ? (thread.riskLabel ?? 'Needs review') : undefined,
    nextActionLabel: correctedAsCommercial
      ? (thread.nextActionLabel ?? 'Review as paid collab')
      : i18n.t('inboxScreen.reclassifiedNote'),
    inboxPriority: correctedPriority ?? thread.inboxPriority,
    leadValueBand:
      correctedPriority === 'p3'
        ? 'archived'
        : correctedPriority === 'p2'
          ? 'needs_negotiation'
          : correctedAsCommercial
            ? thread.leadValueBand
            : 'archived',
  };
}

export function applyInboxDetailCorrection(
  detail: InboxThreadDetail,
  corrections: Record<string, ClassificationCorrection>
): InboxThreadDetail {
  const corrected = applyInboxClassificationCorrection(detail, corrections);
  const correction = corrections[detail.id];
  if (!correction) return corrected;
  const correctedAsCommercial = correction.category === 'commercial';

  return {
    ...corrected,
    signals: corrected.signals?.length ? corrected.signals : [`User corrected classification to ${correction.category}`],
    recommendedActions: correctedAsCommercial
      ? corrected.recommendedActions.length
        ? corrected.recommendedActions
        : [
            'Confirm whether this is paid or gifted.',
            'Ask for deliverables, timeline, and usage scope.',
            'Request budget range before quoting.',
          ]
      : [],
    riskFlags: correctedAsCommercial
      ? corrected.riskFlags.length
        ? corrected.riskFlags
        : [
            {
              id: `user-correction-${detail.id}`,
              label: 'Classification corrected by you',
              severity: 'info',
              hint: 'AI will treat similar emails as possible commercial leads in this demo session.',
            },
          ]
      : [],
  };
}
