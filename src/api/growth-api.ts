import { apiRequest, ApiError } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { mapRateCardDto, toRateCardUpsertRequest, type RateCardPackageDto } from '@/src/api/growth-mappers';
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
  fetchMockRateCardPackages,
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

export type PublicMediaKitPayload = {
  preview: MediaKitPreview;
  sectionOrder?: MediaKitSectionId[];
};

export async function fetchRateCardPackages(): Promise<RateCardPackage[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockRateCardPackages();
  }
  const items = await apiRequest<RateCardPackageDto[]>('/api/v1/rate-cards');
  return items.map(mapRateCardDto);
}

export async function upsertRateCardPackages(packages: RateCardPackage[]): Promise<RateCardPackage[]> {
  if (!shouldUseBackendApi()) {
    return upsertMockRateCardPackages(packages);
  }
  const items = await apiRequest<RateCardPackageDto[]>('/api/v1/rate-cards', {
    method: 'PUT',
    body: toRateCardUpsertRequest(packages),
  });
  return items.map(mapRateCardDto);
}

export async function fetchProposalPreview(proposalId: string): Promise<ProposalPreview> {
  if (!shouldUseBackendApi()) {
    return fetchMockProposalPreview(proposalId);
  }
  const dto = await apiRequest<unknown>(`/api/v1/proposals/${proposalId}`);
  const proposal = mapProposalPreview(dto);
  if (proposal.creatorSnapshot) return proposal;
  const mediaKitPreview = await fetchMediaKitPreview();
  return { ...proposal, creatorSnapshot: toCreatorPublicSnapshot(mediaKitPreview) };
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
