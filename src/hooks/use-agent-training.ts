import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  clearAgentTrainingRules,
  createAgentTrainingRule,
  fetchAgentTrainingRules,
} from '@/src/api/agent-training-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { invalidateTenantScopedQueries, useTenantApiQueryEnabled, useTenantQueryKey } from '@/src/lib/tenant-query';
import {
  useAgentTrainingStore,
  type AgentTrainingRule,
} from '@/src/stores/agent-training-store';

export function useAgentTrainingRules() {
  const queryClient = useQueryClient();
  const localRules = useAgentTrainingStore((s) => s.rules);
  const replaceRules = useAgentTrainingStore((s) => s.replaceRules);
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('account', 'agent-training-rules', { api: apiMode });
  const enabled = useTenantApiQueryEnabled();

  const query = useQuery({
    queryKey,
    queryFn: fetchAgentTrainingRules,
    enabled,
  });

  useEffect(() => {
    if (query.data) {
      replaceRules(query.data);
    }
  }, [query.data, replaceRules]);

  const createMutation = useMutation({
    mutationFn: (input: Omit<AgentTrainingRule, 'id' | 'createdAtISO'>) => createAgentTrainingRule(input),
    onSuccess: () => {
      void invalidateTenantScopedQueries(queryClient);
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearAgentTrainingRules,
    onSuccess: () => {
      replaceRules([]);
      void invalidateTenantScopedQueries(queryClient);
    },
  });

  const rules = shouldUseBackendApi() ? (query.data ?? localRules) : localRules;

  return {
    rules,
    isLoading: shouldUseBackendApi() && query.isPending,
    createRule: createMutation.mutateAsync,
    clearRules: async () => {
      if (shouldUseBackendApi()) {
        await clearMutation.mutateAsync();
        return;
      }
      useAgentTrainingStore.getState().clearRules();
    },
  };
}
