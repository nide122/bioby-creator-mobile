import { create } from 'zustand';

import type { InboxEmailCategory } from '@/src/types/domain';

export type AgentTrainingRule = {
  id: string;
  title: string;
  description: string;
  category: InboxEmailCategory;
  createdAtISO: string;
};

type AgentTrainingState = {
  rules: AgentTrainingRule[];
  addRule: (rule: Omit<AgentTrainingRule, 'id' | 'createdAtISO'>) => void;
  replaceRules: (rules: AgentTrainingRule[]) => void;
  clearRules: () => void;
};

export const useAgentTrainingStore = create<AgentTrainingState>((set) => ({
  rules: [],
  replaceRules: (rules) => set({ rules }),
  addRule: (rule) =>
    set((state) => {
      const existing = state.rules.find((item) => item.category === rule.category);
      if (existing) return state;

      return {
        rules: [
          {
            ...rule,
            id: `rule-${Date.now()}-${state.rules.length}`,
            createdAtISO: new Date().toISOString(),
          },
          ...state.rules,
        ],
      };
    }),
  clearRules: () => set({ rules: [] }),
}));
