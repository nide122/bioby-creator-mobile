import { apiRequest, ApiError } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { mapRateCardDto, toRateCardUpsertRequest } from '@/src/api/growth-mappers';
import type { RateCardPackageView } from '@/src/types/api';
import { mapMediaKitDocument, mapMediaKitDto, mapProposalPreview, mapPublicMediaKitPayload } from '@/src/api/media-kit-mappers';
import { fetchPublicProofCatalog } from '@/src/api/trust-api';
import { parseContactSlug } from '@/src/lib/media-kit-contact-url';
import { mergeMediaKitPreviewPublicProofs } from '@/src/lib/public-proof';
import { resolveSectionOrderFromDocument } from '@/src/lib/media-kit-sections';
import { toCreatorPublicSnapshot } from '@/src/lib/media-kit-creator-snapshot';
import {
  fetchMockMediaKitDocument,
  fetchMockMediaKitPreview,
  fetchMockProposalPreview,
  fetchMockProposalForOpportunity,
  fetchMockRateCardPackages,
  createMockProposal,
  saveMockProposal,
  upsertMockRateCardPackages,
  importMockBattleReportToMediaKit,
  upsertMockMediaKitDocument,
} from '@/src/api/mock-growth';
import type {
  MediaKitDocument,
  MediaKitPreview,
  MediaKitSectionId,
  ProposalPreview,
  RateCardPackage,
} from '@/src/types/domain';
import type { ProposalCreateInput } from '@/src/lib/proposal-from-package';

export type PublicMediaKitPayload = {
  preview: MediaKitPreview;
  sectionOrder?: MediaKitSectionId[];
};

export type ProposalDraft = {
  id: string;
  approvalState: 'PENDING' | 'APPROVED';
  generationSource?: string;
  proposal: ProposalPreview;
};

export async function fetchRateCardPackages(): Promise<RateCardPackage[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockRateCardPackages();
  }
  const items = await apiRequest<RateCardPackageView[]>('/api/v1/rate-cards');
  return items.map(mapRateCardDto);
}

export async function upsertRateCardPackages(packages: RateCardPackage[]): Promise<RateCardPackage[]> {
  if (!shouldUseBackendApi()) {
    return upsertMockRateCardPackages(packages);
  }
  const items = await apiRequest<RateCardPackageView[]>('/api/v1/rate-cards', {
    method: 'PUT',
    body: toRateCardUpsertRequest(packages),
  });
  return items.map(mapRateCardDto);
}

export async function fetchProposalPreview(proposalId: string): Promise<ProposalPreview> {
  if (!shouldUseBackendApi()) {
    return fetchMockProposalPreview(proposalId);
  }
  const dto = await apiRequest<unknown>(`/api/v1/proposals/${encodeURIComponent(proposalId)}`);
  const proposal = mapProposalPreview(dto);
  if (proposal.creatorSnapshot) return proposal;
  const mediaKitPreview = await fetchMediaKitPreview();
  return { ...proposal, creatorSnapshot: toCreatorPublicSnapshot(mediaKitPreview) };
}

export async function createProposal(input: ProposalCreateInput): Promise<ProposalPreview> {
  if (!shouldUseBackendApi()) {
    return createMockProposal(input);
  }
  const dto = await apiRequest<unknown>('/api/v1/proposals', {
    method: 'POST',
    body: input,
  });
  return mapProposalPreview(dto);
}

export async function fetchProposalForOpportunity(opportunityId: string): Promise<ProposalPreview | null> {
  if (!shouldUseBackendApi()) {
    return fetchMockProposalForOpportunity(opportunityId);
  }
  try {
    const dto = await apiRequest<unknown>(`/api/v1/opportunities/${encodeURIComponent(opportunityId)}/proposal`);
    return mapProposalPreview(dto);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function fetchProposalRevisions(proposalId: string): Promise<ProposalPreview[]> {
  if (!shouldUseBackendApi()) {
    const current = await fetchMockProposalPreview(proposalId);
    return [current];
  }
  const items = await apiRequest<unknown[]>(`/api/v1/proposals/${encodeURIComponent(proposalId)}/revisions`);
  return items.map(mapProposalPreview);
}

export async function generateProposalDraft(input: ProposalCreateInput): Promise<ProposalDraft> {
  if (!shouldUseBackendApi()) {
    const proposal = await createMockProposal({ ...input, previewOnly: true });
    return {
      id: `local-${proposal.id}`,
      approvalState: 'PENDING',
      generationSource: proposal.generationSource,
      proposal: { ...proposal, draftId: `local-${proposal.id}`, preview: true, saved: false },
    };
  }
  const dto = await apiRequest<unknown>('/api/v1/proposal-drafts/generate', {
    method: 'POST',
    body: input,
  });
  return mapProposalDraft(dto);
}

export async function generateProposalRevision(proposalId: string, locale?: string): Promise<ProposalDraft> {
  if (!shouldUseBackendApi()) {
    const base = await fetchMockProposalPreview(proposalId);
    const proposal = await createMockProposal({
      packageId: base.packageId ?? 'launch-bundle',
      opportunityId: base.opportunityId,
      brandHint: base.brandHint,
      locale,
      previewOnly: true,
    });
    proposal.baseProposalId = proposalId;
    proposal.rootProposalId = base.rootProposalId ?? proposalId;
    proposal.proposedVersion = (base.version ?? 1) + 1;
    return {
      id: `local-revision-${proposal.id}`,
      approvalState: 'PENDING',
      generationSource: proposal.generationSource,
      proposal: { ...proposal, draftId: `local-revision-${proposal.id}`, preview: true, saved: false },
    };
  }
  const dto = await apiRequest<unknown>(`/api/v1/proposals/${encodeURIComponent(proposalId)}/revisions/generate`, {
    method: 'POST',
    body: { locale },
  });
  return mapProposalDraft(dto);
}

export async function fetchProposalDraft(draftId: string): Promise<ProposalDraft> {
  if (!shouldUseBackendApi()) {
    throw new Error('Proposal draft recovery is unavailable in mock mode.');
  }
  const dto = await apiRequest<unknown>(`/api/v1/proposal-drafts/${encodeURIComponent(draftId)}`);
  return mapProposalDraft(dto);
}

export async function confirmProposalDraft(draftId: string, proposal: ProposalPreview): Promise<ProposalPreview> {
  if (!shouldUseBackendApi()) {
    return saveMockProposal({ ...proposal, preview: false, saved: true });
  }
  const dto = await apiRequest<unknown>(`/api/v1/proposal-drafts/${encodeURIComponent(draftId)}/confirm`, {
    method: 'POST',
    body: { proposalDocument: proposal },
  });
  const root = dto && typeof dto === 'object' ? (dto as { proposal?: unknown }) : {};
  const saved = mapProposalPreview(root.proposal);
  if (saved.creatorSnapshot) return saved;
  const mediaKitPreview = await fetchMediaKitPreview();
  return { ...saved, creatorSnapshot: toCreatorPublicSnapshot(mediaKitPreview) };
}

export async function saveProposal(proposal: ProposalPreview): Promise<ProposalPreview> {
  if (!shouldUseBackendApi()) {
    return saveMockProposal(proposal);
  }
  const dto = await apiRequest<unknown>(`/api/v1/proposals/${encodeURIComponent(proposal.id)}`, {
    method: 'PUT',
    body: { document: proposal },
  });
  const saved = mapProposalPreview(dto);
  if (saved.creatorSnapshot) return saved;
  const mediaKitPreview = await fetchMediaKitPreview();
  return { ...saved, creatorSnapshot: toCreatorPublicSnapshot(mediaKitPreview) };
}

function mapProposalDraft(dto: unknown): ProposalDraft {
  const root = dto && typeof dto === 'object' ? (dto as Record<string, unknown>) : {};
  const id = typeof root.id === 'string' ? root.id : '';
  if (!id) throw new Error('Proposal draft response is missing an id.');
  const proposal = mapProposalPreview(root.proposalDocument);
  return {
    id,
    approvalState: root.approvalState === 'APPROVED' ? 'APPROVED' : 'PENDING',
    generationSource: typeof root.generationSource === 'string' ? root.generationSource : proposal.generationSource,
    proposal: {
      ...proposal,
      draftId: id,
      preview: true,
      saved: false,
    },
  };
}

export async function fetchMediaKitDocument(): Promise<MediaKitDocument> {
  if (!shouldUseBackendApi()) {
    return fetchMockMediaKitDocument();
  }
  const dto = await apiRequest<unknown>('/api/v1/media-kit');
  return mapMediaKitDocument(dto);
}

export async function upsertMediaKitDocument(document: MediaKitDocument): Promise<MediaKitDocument> {
  if (!shouldUseBackendApi()) {
    return upsertMockMediaKitDocument(document);
  }
  const dto = await apiRequest<unknown>('/api/v1/media-kit', {
    method: 'PUT',
    body: { document },
  });
  return mapMediaKitDocument(dto);
}

export async function fetchMediaKitPreview(): Promise<MediaKitPreview> {
  if (!shouldUseBackendApi()) {
    const [preview, document] = await Promise.all([
      fetchMockMediaKitPreview(),
      fetchMockMediaKitDocument(),
    ]);
    return attachPublicProofsToPreview(preview, document);
  }
  const [previewDto, documentDto] = await Promise.all([
    apiRequest<unknown>('/api/v1/media-kit/preview'),
    apiRequest<unknown>('/api/v1/media-kit'),
  ]);
  const preview = mapMediaKitDto(previewDto);
  const document = mapMediaKitDocument(documentDto);
  return attachPublicProofsToPreview(preview, document);
}

async function attachPublicProofsToPreview(
  preview: MediaKitPreview,
  document: MediaKitDocument
): Promise<MediaKitPreview> {
  const catalog = await fetchPublicProofCatalog();
  return mergeMediaKitPreviewPublicProofs(preview, document, catalog);
}

export async function importBattleReportToMediaKit(reportId: string): Promise<MediaKitDocument> {
  if (!shouldUseBackendApi()) {
    return importMockBattleReportToMediaKit(reportId);
  }
  const dto = await apiRequest<unknown>(`/api/v1/media-kit/import-battle-report/${encodeURIComponent(reportId)}`, {
    method: 'POST',
  });
  return mapMediaKitDocument(dto);
}

export async function fetchPublicMediaKitBySlug(slug: string): Promise<PublicMediaKitPayload> {
  if (!shouldUseBackendApi()) {
    const preview = await fetchMediaKitPreview();
    const expectedSlug = parseContactSlug(preview.contactUrl);
    if (expectedSlug !== slug) {
      throw new ApiError(404, 'NOT_FOUND', 'Media kit not found');
    }
    const document = await fetchMockMediaKitDocument();
    return {
      preview,
      sectionOrder: resolveSectionOrderFromDocument(document),
    };
  }
  const dto = await apiRequest<unknown>(`/api/v1/public/creators/${encodeURIComponent(slug)}/media-kit`, {
    auth: false,
  });
  return mapPublicMediaKitPayload(dto);
}
