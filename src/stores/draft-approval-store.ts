import { create } from 'zustand';

type DraftApprovalState = {
  /** draft id → ISO 审批通过时间（演示） */
  approvedAtById: Record<string, string>;
  approveDraft: (draftId: string) => void;
  isDraftApproved: (draftId: string) => boolean;
  resetDraftApprovals: () => void;
};

export const useDraftApprovalStore = create<DraftApprovalState>((set, get) => ({
  approvedAtById: {},

  approveDraft: (draftId) =>
    set((s) => ({
      approvedAtById: {
        ...s.approvedAtById,
        [draftId]: new Date().toISOString(),
      },
    })),

  isDraftApproved: (draftId) => !!get().approvedAtById[draftId],

  resetDraftApprovals: () => set({ approvedAtById: {} }),
}));
