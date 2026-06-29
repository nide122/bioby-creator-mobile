import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { extractReplyTemplateVariables } from '@/src/lib/reply-template-render';
import { DEFAULT_REPLY_TEMPLATES, mergeDefaultReplyTemplates } from '@/src/lib/default-reply-templates';
import type { ReplyTemplate, UpsertReplyTemplateInput } from '@/src/types/reply-template';

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
      templates: DEFAULT_REPLY_TEMPLATES,
      replaceTemplates: (templates) => set({ templates: mergeDefaultReplyTemplates(templates) }),
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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ templates: state.templates }),
      migrate: (persisted) => {
        const state = persisted as ReplyTemplateState | undefined;
        if (!state?.templates) {
          return { templates: DEFAULT_REPLY_TEMPLATES };
        }
        return { templates: mergeDefaultReplyTemplates(state.templates) };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.replaceTemplates(state.templates);
        }
      },
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
