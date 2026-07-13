import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  fetchMediaKitDocument,
  fetchMediaKitPreview,
  fetchProposalPreview,
  fetchProposalForOpportunity,
  fetchProposalRevisions,
  fetchProposalDraft,
  fetchRateCardPackages,
  createProposal,
  generateProposalDraft,
  generateProposalRevision,
  confirmProposalDraft,
  saveProposal,
  upsertRateCardPackages,
  importBattleReportToMediaKit,
  upsertMediaKitDocument,
} from '@/src/api/growth-api';
import type { ProposalCreateInput } from '@/src/lib/proposal-from-package';
import { isProposalPreviewDraft } from '@/src/lib/proposal-from-package';
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
import type { MediaKitDocument, ProposalPreview, RateCardPackage } from '@/src/types/domain';
import type { ProposalDraft } from '@/src/api/growth-api';

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

export function proposalPreviewQueryKey(proposalId: string | undefined): unknown[] {
  return tenantQueryKey(getActiveTenantPublicId(), 'growth', 'proposal', proposalId, {
    api: shouldUseBackendApi(),
  });
}

export function proposalDraftQueryKey(draftId: string | undefined): unknown[] {
  return tenantQueryKey(getActiveTenantPublicId(), 'growth', 'proposal-draft', draftId, {
    api: shouldUseBackendApi(),
  });
}

export function readCachedProposalPreview(
  queryClient: QueryClient,
  proposalId: string | undefined,
): ProposalPreview | undefined {
  if (!proposalId) return undefined;
  return queryClient.getQueryData<ProposalPreview>(proposalPreviewQueryKey(proposalId));
}

export function useProposalPreview(proposalId: string | undefined) {
  const queryClient = useQueryClient();
  const tenantPublicId = useSessionStore((s) => s.tenantPublicId);
  const apiMode = shouldUseBackendApi();
  const queryKey = tenantQueryKey(tenantPublicId, 'growth', 'proposal', proposalId, { api: apiMode });
  const enabled = useTenantScopedQueryEnabled();
  const cached = readCachedProposalPreview(queryClient, proposalId);
  const cachedPreviewDraft = cached ? isProposalPreviewDraft(cached) : false;

  return useQuery({
    queryKey,
    queryFn: async () => {
      const latest = queryClient.getQueryData<ProposalPreview>(queryKey);
      if (latest && isProposalPreviewDraft(latest)) {
        return latest;
      }
      return fetchProposalPreview(proposalId as string);
    },
    enabled: enabled && !!proposalId && !cachedPreviewDraft,
    initialData: cached,
    staleTime: cachedPreviewDraft ? Infinity : 0,
    refetchOnMount: cachedPreviewDraft ? false : true,
    refetchOnWindowFocus: !cachedPreviewDraft,
    retry: cachedPreviewDraft ? false : undefined,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProposalCreateInput) => createProposal(input),
    onSuccess: async (proposal) => {
      queryClient.setQueryData(proposalPreviewQueryKey(proposal.id), proposal);
      if (!proposal.preview) {
        await invalidateTenantScopedQueries(queryClient);
      }
    },
  });
}

export function useProposalForOpportunity(opportunityId: string | undefined) {
  const enabled = useTenantScopedQueryEnabled();
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('growth', 'proposal-for-opportunity', opportunityId, { api: apiMode });
  return useQuery({
    queryKey,
    queryFn: () => fetchProposalForOpportunity(opportunityId as string),
    enabled: enabled && !!opportunityId,
    retry: false,
  });
}

export function useProposalRevisions(proposalId: string | undefined) {
  const enabled = useTenantScopedQueryEnabled();
  const apiMode = shouldUseBackendApi();
  const queryKey = useTenantQueryKey('growth', 'proposal-revisions', proposalId, { api: apiMode });
  return useQuery({
    queryKey,
    queryFn: () => fetchProposalRevisions(proposalId as string),
    enabled: enabled && !!proposalId,
  });
}

export function useProposalDraft(draftId: string | undefined) {
  const enabled = useTenantScopedQueryEnabled();
  return useQuery({
    queryKey: proposalDraftQueryKey(draftId),
    queryFn: () => fetchProposalDraft(draftId as string),
    enabled: enabled && !!draftId,
  });
}

export function useGenerateProposalDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProposalCreateInput) => generateProposalDraft(input),
    onSuccess: (draft) => {
      queryClient.setQueryData(proposalDraftQueryKey(draft.id), draft);
      queryClient.setQueryData(proposalPreviewQueryKey(draft.proposal.id), draft.proposal);
    },
  });
}

export function useGenerateProposalRevision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, locale }: { proposalId: string; locale?: string }) =>
      generateProposalRevision(proposalId, locale),
    onSuccess: (draft) => {
      queryClient.setQueryData(proposalDraftQueryKey(draft.id), draft);
      queryClient.setQueryData(proposalPreviewQueryKey(draft.proposal.id), draft.proposal);
    },
  });
}

export function useConfirmProposalDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, proposal }: { draftId: string; proposal: ProposalPreview }) =>
      confirmProposalDraft(draftId, proposal),
    onSuccess: async (proposal, variables) => {
      queryClient.setQueryData(proposalPreviewQueryKey(proposal.id), proposal);
      queryClient.removeQueries({ queryKey: proposalDraftQueryKey(variables.draftId) });
      await invalidateTenantScopedQueries(queryClient);
    },
  });
}

export function useSaveProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposal: ProposalPreview) => saveProposal(proposal),
    onSuccess: async (proposal) => {
      queryClient.setQueryData(proposalPreviewQueryKey(proposal.id), proposal);
      await invalidateTenantScopedQueries(queryClient);
    },
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
