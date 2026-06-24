import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
import { migrateLegacyProfileBasics } from '@/src/lib/creator-profile-aggregate';
import { resolveMediaKitAboutTags } from '@/src/lib/media-kit-preview';
import { resolveMediaKitPreviewPlatforms } from '@/src/lib/platform-matrix-sync';
import {
  getActiveTenantPublicId,
  invalidateTenantScopedQueries,
  tenantQueryKey,
  useTenantQueryKey,
  useTenantScopedQueryEnabled,
} from '@/src/lib/tenant-query';
import { mergeMediaKitPreviewPublicProofs } from '@/src/lib/public-proof';
import { usePublicProofCatalog } from '@/src/hooks/use-trust-metrics';
import { useSessionStore } from '@/src/stores/session-store';
import type { MediaKitDocument, RateCardPackage } from '@/src/types/domain';

export function rateCardPackagesQueryKey(): unknown[] {
  return tenantQueryKey(getActiveTenantPublicId(), 'growth', 'rate-cards', { api: shouldUseBackendApi() });
}

export function patchRateCardPackagesCache(
  queryClient: QueryClient,
  packages: RateCardPackage[],
): void {
  queryClient.setQueryData(rateCardPackagesQueryKey(), packages);
}

export function useRateCardPackages() {
  const queryKey = rateCardPackagesQueryKey();
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey,
    queryFn: fetchRateCardPackages,
    enabled,
    staleTime: 0,
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
  const profileBasics = useSessionStore((s) => s.profileBasics);

  const data = useMemo(
    () => {
      if (!query.data) return undefined;

      let preview = mergeMediaKitPreviewPublicProofs(query.data, documentQuery.data, catalogQuery.data);

      if (documentQuery.data) {
        const { platformProfiles } = migrateLegacyProfileBasics(profileBasics);
        preview = {
          ...preview,
          platforms: resolveMediaKitPreviewPlatforms(documentQuery.data.platforms, platformProfiles),
        };
      }

      const aboutTags = resolveMediaKitAboutTags(profileBasics, documentQuery.data ?? {});
      if (aboutTags?.length) {
        preview = { ...preview, aboutTags };
      }

      return preview;
    },
    [query.data, documentQuery.data, catalogQuery.data, profileBasics],
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
    onSuccess: async (updatedPackages) => {
      patchRateCardPackagesCache(queryClient, updatedPackages);
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
