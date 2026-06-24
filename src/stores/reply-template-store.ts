import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { extractReplyTemplateVariables } from '@/src/lib/reply-template-render';
import type { ReplyTemplate, UpsertReplyTemplateInput } from '@/src/types/reply-template';

const SEED_TEMPLATES: ReplyTemplate[] = [
  {
    id: 'tpl-quote-follow',
    name: 'Quote follow-up',
    body: 'Hi ⟦brandName⟧,\n\nThanks for reaching out about ⟦cooperationTitle⟧. I can share a structured quote once we confirm ⟦deliverables⟧, usage, and ⟦postingSchedule⟧.\n\nBest,\n⟦creatorName⟧',
    variables: ['brandName', 'cooperationTitle', 'deliverables', 'postingSchedule', 'creatorName'],
    isDefault: true,
    sortOrder: 0,
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: 'tpl-scope-clarify',
    name: 'Clarify scope',
    body: 'Hi ⟦brandName⟧,\n\nBefore I quote on ⟦cooperationTitle⟧, could you confirm revision rounds, usage rights, and the target publish window?\n\nThanks,\n⟦creatorName⟧',
    variables: ['brandName', 'cooperationTitle', 'creatorName'],
    isDefault: false,
    sortOrder: 1,
    updatedAtISO: new Date().toISOString(),
  },
];

const MAX_TEMPLATES = 20;

type ReplyTemplateState = {
  templates: ReplyTemplate[];
  replaceTemplates: (templates: ReplyTemplate[]) => void;
  createTemplate: (input: UpsertReplyTemplateInput) => ReplyTemplate;
  updateTemplate: (id: string, input: UpsertReplyTemplateInput) => ReplyTemplate;
  deleteTemplate: (id: string) => void;
};

function normalizeTemplate(id: string, input: UpsertReplyTemplateInput, existing?: ReplyTemplate): ReplyTemplate {
  const body = input.body.trim();
  return {
    id,
    name: input.name.trim(),
    body,
    variables: extractReplyTemplateVariables(body),
    isDefault: input.isDefault ?? existing?.isDefault ?? false,
    sortOrder: input.sortOrder ?? existing?.sortOrder ?? 0,
    updatedAtISO: new Date().toISOString(),
  };
}

export const useReplyTemplateStore = create<ReplyTemplateState>()(
  persist(
    (set, get) => ({
      templates: SEED_TEMPLATES,
      replaceTemplates: (templates) => set({ templates }),
      createTemplate: (input) => {
        const current = get().templates;
        if (current.length >= MAX_TEMPLATES) {
          throw new Error('TEMPLATE_LIMIT_REACHED');
        }
        const row = normalizeTemplate(`tpl-local-${Date.now()}`, input);
        const next = [...current, row];
        set({
          templates: applyDefaultRules(next, row),
        });
        return row;
      },
      updateTemplate: (id, input) => {
        let updated: ReplyTemplate | null = null;
        set((state) => {
          const current = state.templates.map((item) => {
            if (item.id !== id) return item;
            updated = normalizeTemplate(id, input, item);
            return updated;
          });
          if (!updated) return state;
          return { templates: applyDefaultRules(current, updated) };
        });
        if (!updated) throw new Error('NOT_FOUND');
        return updated;
      },
      deleteTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((item) => item.id !== id) }));
      },
    }),
    {
      name: 'reply-template-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ templates: state.templates }),
    },
  ),
);

function applyDefaultRules(templates: ReplyTemplate[], changed: ReplyTemplate): ReplyTemplate[] {
  if (!changed.isDefault) return templates;
  return templates.map((item) => ({
    ...item,
    isDefault: item.id === changed.id,
  }));
}
