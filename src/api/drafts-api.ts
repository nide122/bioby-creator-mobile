import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { mapDraftDetail, mapDraftSummary } from '@/src/api/draft-mappers';
import { fetchMockDraftDetail, fetchMockDrafts } from '@/src/api/mock-draft';
import type { GeneratedReplyDraftView, SuggestedReplyPurposeView } from '@/src/types/api';
import type { DraftDetailView, DraftListItemView } from '@/src/types/api';
import type { ReplyDraftPurpose } from '@/src/lib/reply-draft-purpose';
import type { DraftDetail, DraftKind, DraftSummary } from '@/src/types/domain';
import type { NegotiationDraftKind } from '@/src/lib/negotiation-draft-kinds';

export type GeneratedReplyDraftDto = GeneratedReplyDraftView;

export type GeneratedReplyDraft = {
  draft: DraftDetail | null;
  source: 'llm' | 'rules';
  purpose: ReplyDraftPurpose;
  suggestedPurpose: ReplyDraftPurpose;
  preview: boolean;
  previewBody?: string | null;
  previewSubject?: string | null;
};

export type SuggestedReplyPurposeDto = SuggestedReplyPurposeView;

export type GenerateReplyDraftInput = {
  purpose?: ReplyDraftPurpose;
  rateCardPackageId?: string;
  locale?: string;
  /** overwrite (default) or fresh */
  mode?: 'overwrite' | 'fresh';
  overwriteDraftId?: string;
  replyTemplateId?: string;
};

export async function fetchDraftList(): Promise<DraftSummary[]> {
  if (!shouldUseBackendApi()) {
    return fetchMockDrafts();
  }
  const items = await apiRequest<DraftListItemView[]>('/api/v1/drafts');
  return items.map(mapDraftSummary);
}

export async function fetchDraftDetail(draftId: string): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(draftId);
  }
  const item = await apiRequest<DraftDetailView>(`/api/v1/drafts/${draftId}`);
  return mapDraftDetail(item);
}

export async function createDraftForOpportunity(
  opportunityId: string,
  kind: DraftKind,
): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(kind === 'quote' ? 'draft-quote-02' : 'draft-reply-01');
  }
  const item = await apiRequest<DraftDetailView>('/api/v1/drafts', {
    method: 'POST',
    body: { opportunityId, kind },
  });
  return mapDraftDetail(item);
}

export async function applyDraftScenarioKind(
  draftId: string,
  kind: NegotiationDraftKind,
  body?: string,
): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(draftId);
  }
  const item = await apiRequest<DraftDetailView>(`/api/v1/drafts/${draftId}/apply-kind`, {
    method: 'POST',
    body: { kind, body: body?.trim() || undefined },
  });
  return mapDraftDetail(item);
}

export async function approveDraftOnServer(draftId: string): Promise<DraftDetail> {
  if (!shouldUseBackendApi()) {
    return fetchMockDraftDetail(draftId);
  }
  const item = await apiRequest<DraftDetailView>(`/api/v1/drafts/${draftId}/approve`, { method: 'POST' });
  return mapDraftDetail(item);
}

export type RemoteDraftSyncInput = {
  emailMessageId?: number | null;
  to?: string[];
  subject?: string;
  bodyText?: string;
};

export type RemoteDraftSyncResult = {
  outboundId: number;
  draftId: number;
  status: string;
  provider: string;
  remoteDraftId?: string | null;
  providerMessageId?: string | null;
  providerThreadId?: string | null;
  sentAtISO?: string | null;
  errorMessage?: string | null;
};

export async function syncDraftToNativeMailbox(
  draftId: string,
  input: RemoteDraftSyncInput = {},
): Promise<RemoteDraftSyncResult | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<RemoteDraftSyncResult>(`/api/v1/drafts/${draftId}/remote-draft`, {
    method: 'POST',
    body: input,
  });
}

export async function sendNativeMailboxDraft(draftId: string): Promise<RemoteDraftSyncResult | null> {
  if (!shouldUseBackendApi()) return null;
  return apiRequest<RemoteDraftSyncResult>(`/api/v1/drafts/${draftId}/remote-draft/send`, {
    method: 'POST',
  });
}

function mapGeneratedReplyDraft(dto: GeneratedReplyDraftDto): GeneratedReplyDraft {
  return {
    draft: dto.draft ? mapDraftDetail(dto.draft) : null,
    source: dto.source === 'llm' ? 'llm' : 'rules',
    purpose: (dto.purpose ?? 'pre_outreach') as ReplyDraftPurpose,
    suggestedPurpose: (dto.suggestedPurpose ?? 'pre_outreach') as ReplyDraftPurpose,
    preview: dto.preview === true,
    previewBody: dto.previewBody ?? null,
    previewSubject: dto.previewSubject ?? null,
  };
}

export async function fetchSuggestedReplyPurpose(
  opportunityId: string,
): Promise<{ purpose: ReplyDraftPurpose; draftKind: DraftKind }> {
  if (!shouldUseBackendApi()) {
    return { purpose: 'pre_outreach', draftKind: 'ack_and_schedule' };
  }
  const item = await apiRequest<SuggestedReplyPurposeDto>(
    `/api/v1/opportunities/${opportunityId}/drafts/suggested-purpose`,
  );
  return {
    purpose: (item.purpose ?? 'pre_outreach') as ReplyDraftPurpose,
    draftKind: (item.draftKind ?? 'ai_reply') as DraftKind,
  };
}

export async function generateReplyDraft(
  opportunityId: string,
  input: GenerateReplyDraftInput = {},
): Promise<GeneratedReplyDraft> {
  if (!shouldUseBackendApi()) {
    const mock = await fetchMockDraftDetail('draft-reply-01');
    return {
      draft: mock,
      source: 'rules',
      purpose: input.purpose ?? 'pre_outreach',
      suggestedPurpose: 'pre_outreach',
      preview: false,
      previewBody: null,
      previewSubject: null,
    };
  }
  const item = await apiRequest<GeneratedReplyDraftDto>(
    `/api/v1/opportunities/${opportunityId}/drafts/generate`,
    {
      method: 'POST',
      body: {
        purpose: input.purpose,
        rateCardPackageId: input.rateCardPackageId,
        locale: input.locale,
        mode: input.mode,
        overwriteDraftId: input.overwriteDraftId,
        replyTemplateId: input.replyTemplateId,
      },
    },
  );
  return mapGeneratedReplyDraft(item);
}
