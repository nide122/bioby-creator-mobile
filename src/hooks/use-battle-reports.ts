import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  fetchBattleReportById,
  fetchBattleReports,
  generateBattleReport,
  updateBattleReportShareable,
} from '@/src/api/battle-reports-api';
import { invalidateTenantScopedQueries, useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';

export function useBattleReports() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('battle-reports', 'list', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchBattleReports,
    enabled,
  });
}

export function useBattleReport(id: string | undefined) {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('battle-reports', 'detail', id, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => fetchBattleReportById(id as string),
    enabled: enabled && !!id,
  });
}

export function useUpdateBattleReportShareable(reportId: string | undefined) {
  const queryClient = useQueryClient();
  const apiMode = shouldUseBackendApi();
  const detailKey = useTenantQueryKey('battle-reports', 'detail', reportId, { api: apiMode });
  const listKey = useTenantQueryKey('battle-reports', 'list', { api: apiMode });
  return useMutation({
    mutationFn: (shareableToMediaKit: boolean) =>
      updateBattleReportShareable(reportId as string, shareableToMediaKit),
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailKey, updated);
      await queryClient.invalidateQueries({ queryKey: listKey });
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useGenerateBattleReport() {
  const queryClient = useQueryClient();
  const apiMode = shouldUseBackendApi();
  const listKey = useTenantQueryKey('battle-reports', 'list', { api: apiMode });
  return useMutation({
    mutationFn: generateBattleReport,
    onSuccess: async (created) => {
      const detailKey = useTenantQueryKey('battle-reports', 'detail', created.id, { api: apiMode });
      queryClient.setQueryData(detailKey, created);
      await queryClient.invalidateQueries({ queryKey: listKey });
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

/** @deprecated use useBattleReports */
export const useMockBattleReports = useBattleReports;

/** @deprecated use useBattleReport */
export const useMockBattleReport = useBattleReport;
