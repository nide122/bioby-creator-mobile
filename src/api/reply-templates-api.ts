import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import {
  renderReplyTemplate,
  type ReplyTemplateFieldValues,
} from '@/src/lib/reply-template-render';
import { useReplyTemplateStore } from '@/src/stores/reply-template-store';
import type {
  RenderReplyTemplateInput,
  ReplyTemplate,
  UpsertReplyTemplateInput,
} from '@/src/types/reply-template';

type ReplyTemplateDto = {
  id: string;
  name: string;
  body: string;
  variables: string[];
  isDefault: boolean;
  sortOrder: number;
  updatedAtISO: string;
};

type RenderedReplyTemplateDto = {
  body: string;
  variables: string[];
};

function mapTemplate(dto: ReplyTemplateDto): ReplyTemplate {
  return {
    id: dto.id,
    name: dto.name,
    body: dto.body,
    variables: dto.variables ?? [],
    isDefault: dto.isDefault,
    sortOrder: dto.sortOrder,
    updatedAtISO: dto.updatedAtISO,
  };
}

function toRenderPayload(input: RenderReplyTemplateInput) {
  return {
    opportunityId: input.opportunityId,
    brandName: input.brandName,
    creatorName: input.creatorName,
    cooperationTitle: input.cooperationTitle,
    threadSubject: input.cooperationTitle,
    budgetLabel: input.budgetLabel,
    deliverables: input.deliverables,
    postingSchedule: input.postingSchedule,
    usageRights: input.usageRights,
    packagesSummary: input.packagesSummary,
    primaryRisk: input.primaryRisk,
    recommendedPackage: input.recommendedPackage,
    rateCardFloor: input.rateCardFloor,
    rateCardPackageId: input.rateCardPackageId,
  };
}

export async function fetchReplyTemplates(): Promise<ReplyTemplate[]> {
  if (!shouldUseBackendApi()) {
    return useReplyTemplateStore.getState().templates;
  }
  const items = await apiRequest<ReplyTemplateDto[]>('/api/v1/reply-templates');
  return items.map(mapTemplate);
}

export async function fetchReplyTemplate(id: string): Promise<ReplyTemplate> {
  if (!shouldUseBackendApi()) {
    const item = useReplyTemplateStore.getState().templates.find((row) => row.id === id);
    if (!item) throw new Error('NOT_FOUND');
    return item;
  }
  const item = await apiRequest<ReplyTemplateDto>(`/api/v1/reply-templates/${id}`);
  return mapTemplate(item);
}

export async function createReplyTemplate(input: UpsertReplyTemplateInput): Promise<ReplyTemplate> {
  if (!shouldUseBackendApi()) {
    return useReplyTemplateStore.getState().createTemplate(input);
  }
  const created = await apiRequest<ReplyTemplateDto>('/api/v1/reply-templates', {
    method: 'POST',
    body: input,
  });
  return mapTemplate(created);
}

export async function updateReplyTemplate(id: string, input: UpsertReplyTemplateInput): Promise<ReplyTemplate> {
  if (!shouldUseBackendApi()) {
    return useReplyTemplateStore.getState().updateTemplate(id, input);
  }
  const updated = await apiRequest<ReplyTemplateDto>(`/api/v1/reply-templates/${id}`, {
    method: 'PUT',
    body: input,
  });
  return mapTemplate(updated);
}

export async function deleteReplyTemplate(id: string): Promise<void> {
  if (!shouldUseBackendApi()) {
    useReplyTemplateStore.getState().deleteTemplate(id);
    return;
  }
  await apiRequest(`/api/v1/reply-templates/${id}`, { method: 'DELETE' });
}

export async function renderReplyTemplateOnServer(
  id: string,
  input: RenderReplyTemplateInput,
): Promise<string> {
  if (!shouldUseBackendApi()) {
    const item = useReplyTemplateStore.getState().templates.find((row) => row.id === id);
    if (!item) throw new Error('NOT_FOUND');
    return renderReplyTemplate(item.body, input);
  }
  const rendered = await apiRequest<RenderedReplyTemplateDto>(`/api/v1/reply-templates/${id}/render`, {
    method: 'POST',
    body: toRenderPayload(input),
  });
  return rendered.body;
}

export function renderReplyTemplateLocally(body: string, input: RenderReplyTemplateInput): string {
  const values: ReplyTemplateFieldValues = {
    brandName: input.brandName,
    cooperationTitle: input.cooperationTitle,
    creatorName: input.creatorName,
    budgetLabel: input.budgetLabel,
    deliverables: input.deliverables,
    postingSchedule: input.postingSchedule,
    usageRights: input.usageRights,
    packagesSummary: input.packagesSummary,
    primaryRisk: input.primaryRisk,
    recommendedPackage: input.recommendedPackage,
    rateCardFloor: input.rateCardFloor,
  };
  return renderReplyTemplate(body, values);
}
