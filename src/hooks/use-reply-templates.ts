import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  createReplyTemplate,
  deleteReplyTemplate,
  fetchReplyTemplates,
  updateReplyTemplate,
} from '@/src/api/reply-templates-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useTenantApiQueryEnabled, useTenantQueryKey } from '@/src/lib/tenant-query';
import { useReplyTemplateStore } from '@/src/stores/reply-template-store';
import type { ReplyTemplate, UpsertReplyTemplateInput } from '@/src/types/reply-template';

function applyDefaultTemplateRules(templates: ReplyTemplate[], changed: ReplyTemplate): ReplyTemplate[] {
  if (!changed.isDefault) return templates;
  return templates.map((item) => ({
    ...item,
    isDefault: item.id === changed.id,
  }));
}

function appendReplyTemplate(templates: ReplyTemplate[], created: ReplyTemplate): ReplyTemplate[] {
  return applyDefaultTemplateRules([...templates, created], created);
}

function replaceReplyTemplate(templates: ReplyTemplate[], updated: ReplyTemplate): ReplyTemplate[] {
  const next = templates.map((item) => (item.id === updated.id ? updated : item));
  return applyDefaultTemplateRules(next, updated);
}

export function useReplyTemplates() {
  const queryClient = useQueryClient();
  const localTemplates = useReplyTemplateStore((s) => s.templates);
  const replaceTemplates = useReplyTemplateStore((s) => s.replaceTemplates);
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('reply-templates', { api: apiMode });
  const enabled = useTenantApiQueryEnabled();

  const query = useQuery({
    queryKey,
    queryFn: fetchReplyTemplates,
    enabled,
  });

  useEffect(() => {
    if (query.data) {
      replaceTemplates(query.data);
    }
  }, [query.data, replaceTemplates]);

  const syncReplyTemplateCache = async (nextTemplates: ReplyTemplate[]) => {
    queryClient.setQueryData<ReplyTemplate[]>(queryKey, nextTemplates);
    replaceTemplates(nextTemplates);
    await queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: (input: UpsertReplyTemplateInput) => createReplyTemplate(input),
    onSuccess: async (created) => {
      if (!apiMode) return;
      const current = queryClient.getQueryData<ReplyTemplate[]>(queryKey) ?? [];
      await syncReplyTemplateCache(appendReplyTemplate(current, created));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertReplyTemplateInput }) => updateReplyTemplate(id, input),
    onSuccess: async (updated) => {
      if (!apiMode) return;
      const current = queryClient.getQueryData<ReplyTemplate[]>(queryKey) ?? [];
      await syncReplyTemplateCache(replaceReplyTemplate(current, updated));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReplyTemplate(id),
    onSuccess: async (_result, id) => {
      if (!apiMode) return;
      const current = queryClient.getQueryData<ReplyTemplate[]>(queryKey) ?? [];
      await syncReplyTemplateCache(current.filter((item) => item.id !== id));
    },
  });

  const templates = apiMode ? (query.data ?? []) : localTemplates;

  return {
    templates,
    isLoading: apiMode && query.isPending,
    error: query.error,
    refetch: query.refetch,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: (id: string, input: UpsertReplyTemplateInput) => updateMutation.mutateAsync({ id, input }),
    deleteTemplate: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
