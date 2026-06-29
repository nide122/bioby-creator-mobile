import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  createReplyTemplate,
  deleteReplyTemplate,
  fetchReplyTemplates,
  updateReplyTemplate,
} from '@/src/api/reply-templates-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { invalidateTenantScopedQueries, useTenantApiQueryEnabled, useTenantQueryKey } from '@/src/lib/tenant-query';
import { useReplyTemplateStore } from '@/src/stores/reply-template-store';
import type { UpsertReplyTemplateInput } from '@/src/types/reply-template';

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

  const createMutation = useMutation({
    mutationFn: (input: UpsertReplyTemplateInput) => createReplyTemplate(input),
    onSuccess: () => {
      void invalidateTenantScopedQueries(queryClient);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertReplyTemplateInput }) => updateReplyTemplate(id, input),
    onSuccess: () => {
      void invalidateTenantScopedQueries(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReplyTemplate(id),
    onSuccess: () => {
      void invalidateTenantScopedQueries(queryClient);
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
