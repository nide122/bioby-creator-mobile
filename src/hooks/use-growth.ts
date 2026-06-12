import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  fetchMediaKitDocument,
  fetchMediaKitPreview,
  fetchProposalPreview,
  fetchRateCardPackages,
  upsertRateCardPackages,
  importBattleReportToMediaKit,
  upsertMediaKitDocument,
} from '@/src/api/growth-api';
import { invalidateTenantScopedQueries, useTenantQueryKey, useTenantScopedQueryEnabled } from '@/src/lib/tenant-query';
import { mergeMediaKitPreviewPublicProofs } from '@/src/lib/public-proof';
import { usePublicProofCatalog } from '@/src/hooks/use-trust-metrics';
import type { MediaKitDocument, RateCardPackage } from '@/src/types/domain';

export function useRateCardPackages() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('growth', 'rate-cards', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchRateCardPackages,
    enabled,
  });
}

export function useProposalPreview(proposalId: string | undefined) {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('growth', 'proposal', proposalId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: () => fetchProposalPreview(proposalId as string),
    enabled: enabled && !!proposalId,
  });
}

export function useMediaKitDocument() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('growth', 'media-kit-document', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchMediaKitDocument,
    enabled,
  });
}

export function useMediaKitPreview() {
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('growth', 'media-kit', { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  const query = useQuery({
    queryKey,
    queryFn: fetchMediaKitPreview,
    enabled,
  });
  const documentQuery = useMediaKitDocument();
  const catalogQuery = usePublicProofCatalog();

  const data = useMemo(
    () =>
      query.data
        ? mergeMediaKitPreviewPublicProofs(query.data, documentQuery.data, catalogQuery.data)
        : undefined,
    [query.data, documentQuery.data, catalogQuery.data]
  );

  return {
    ...query,
    data,
    isPending: query.isPending || documentQuery.isPending || catalogQuery.isPending,
  };
}

export function useUpsertRateCardPackages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packages: RateCardPackage[]) => upsertRateCardPackages(packages),
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useUpsertMediaKitDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (document: MediaKitDocument) => upsertMediaKitDocument(document),
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useImportBattleReportToMediaKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => importBattleReportToMediaKit(reportId),
    onSuccess: async () => {
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

/** @deprecated use useRateCardPackages */
export const useMockRateCardPackages = useRateCardPackages;

/** @deprecated use useProposalPreview */
export const useMockProposalPreview = useProposalPreview;

/** @deprecated use useMediaKitPreview */
export const useMockMediaKitPreview = useMediaKitPreview;
