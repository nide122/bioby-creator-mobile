import { apiMultipartRequest, apiRequest } from '@/src/api/api-client';
import type { PickedContractPdf } from '@/src/lib/pick-contract-pdf';
import { buildContractPdfFormData } from '@/src/lib/pick-contract-pdf';
import type { DocumentKind, InboxRiskFlag } from '@/src/types/domain';

export type ContractSummaryStatus = 'DRAFT' | 'PENDING' | 'COMPLETE' | 'FAILED';

export type ContractSummary = {
  id?: string | null;
  opportunityId?: string;
  status: ContractSummaryStatus;
  persisted?: boolean;
  source: 'EMAIL_ATTACHMENT' | 'UPLOAD';
  sourceFilename?: string | null;
  emailAttachmentId?: string | null;
  emailMessageId?: string | null;
  documentType?: DocumentKind | null;
  summary?: string | null;
  deliverables?: string[];
  usageRights?: string[];
  deadlines?: string[];
  riskFlags?: InboxRiskFlag[];
  confidence?: number | null;
  extractionSource?: string | null;
  promptVersion?: string | null;
  errorMessage?: string | null;
  createdAtISO?: string;
  updatedAtISO?: string;
};

export type SaveContractSummaryInput = {
  source: ContractSummary['source'];
  sourceFilename?: string | null;
  emailAttachmentId?: string | null;
  emailMessageId?: string | null;
  documentType?: DocumentKind | null;
  summary: string;
  deliverables?: string[];
  usageRights?: string[];
  deadlines?: string[];
  riskFlags?: InboxRiskFlag[];
  confidence?: number | null;
  extractionSource?: string | null;
  promptVersion?: string | null;
};

function parseRiskFlags(raw: unknown): InboxRiskFlag[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? ''),
      label: String(item.label ?? ''),
      severity: (['info', 'warning', 'danger'].includes(String(item.severity))
        ? String(item.severity)
        : 'info') as InboxRiskFlag['severity'],
      hint: item.hint != null ? String(item.hint) : undefined,
      acknowledged: item.acknowledged === true,
    }))
    .filter((flag) => flag.id.length > 0);
}

export function mapContractSummary(raw: ContractSummary & { riskFlags?: unknown }): ContractSummary {
  return {
    ...raw,
    deliverables: raw.deliverables ?? [],
    usageRights: raw.usageRights ?? [],
    deadlines: raw.deadlines ?? [],
    riskFlags: parseRiskFlags(raw.riskFlags),
    persisted: raw.persisted ?? raw.status === 'COMPLETE',
  };
}

export type SaveEmailDocumentSummaryInput = {
  sourceFilename?: string | null;
  emailAttachmentId?: string | null;
  documentType?: DocumentKind | null;
  summary: string;
  deliverables?: string[];
  usageRights?: string[];
  deadlines?: string[];
  riskFlags?: InboxRiskFlag[];
  confidence?: number | null;
  extractionSource?: string | null;
  promptVersion?: string | null;
};

export function toSaveEmailDocumentSummaryInput(summary: ContractSummary): SaveEmailDocumentSummaryInput {
  return {
    sourceFilename: summary.sourceFilename ?? null,
    emailAttachmentId: summary.emailAttachmentId ?? null,
    documentType: summary.documentType ?? null,
    summary: summary.summary?.trim() ?? '',
    deliverables: summary.deliverables ?? [],
    usageRights: summary.usageRights ?? [],
    deadlines: summary.deadlines ?? [],
    riskFlags: summary.riskFlags ?? [],
    confidence: summary.confidence ?? null,
    extractionSource: summary.extractionSource ?? null,
    promptVersion: summary.promptVersion ?? null,
  };
}

export function toSaveContractSummaryInput(summary: ContractSummary): SaveContractSummaryInput {
  return {
    source: summary.source,
    sourceFilename: summary.sourceFilename ?? null,
    emailAttachmentId: summary.emailAttachmentId ?? null,
    emailMessageId: summary.emailMessageId ?? null,
    documentType: summary.documentType ?? null,
    summary: summary.summary?.trim() ?? '',
    deliverables: summary.deliverables ?? [],
    usageRights: summary.usageRights ?? [],
    deadlines: summary.deadlines ?? [],
    riskFlags: summary.riskFlags ?? [],
    confidence: summary.confidence ?? null,
    extractionSource: summary.extractionSource ?? null,
    promptVersion: summary.promptVersion ?? null,
  };
}

export async function fetchContractSummary(opportunityId: string): Promise<ContractSummary | null> {
  const result = await apiRequest<ContractSummary | null>(
    `/api/v1/opportunities/${opportunityId}/contract-summary`
  );
  return result ? mapContractSummary(result) : null;
}

/** AI preview — does not write to database. */
export async function previewContractFromAttachment(
  opportunityId: string,
  emailMessageId: string,
  attachmentId: string
): Promise<ContractSummary> {
  const result = await apiRequest<ContractSummary>(
    `/api/v1/opportunities/${opportunityId}/contract-summary/from-attachment`,
    {
      method: 'POST',
      body: { emailMessageId, attachmentId },
      timeoutMs: 300_000,
    }
  );
  return mapContractSummary(result);
}

/** AI preview from a locally picked PDF — does not write to database. */
export async function previewContractFromUpload(
  opportunityId: string,
  picked: PickedContractPdf
): Promise<ContractSummary> {
  const result = await apiMultipartRequest<ContractSummary>(
    `/api/v1/opportunities/${opportunityId}/contract-summary/upload`,
    buildContractPdfFormData(picked),
    { timeoutMs: 300_000 }
  );
  return mapContractSummary(result);
}

/** Upsert saved document summary scoped to one email message. */
export async function saveEmailDocumentSummary(
  emailMessageId: string,
  summary: ContractSummary
): Promise<ContractSummary> {
  const result = await apiRequest<ContractSummary>(
    `/api/v1/mailbox/messages/${emailMessageId}/document-summary`,
    {
      method: 'PUT',
      body: toSaveEmailDocumentSummaryInput(summary),
    }
  );
  return mapContractSummary({ ...result, emailMessageId });
}

/** Upsert saved summary for the opportunity. */
export async function saveContractSummary(
  opportunityId: string,
  summary: ContractSummary
): Promise<ContractSummary> {
  const result = await apiRequest<ContractSummary>(`/api/v1/opportunities/${opportunityId}/contract-summary`, {
    method: 'PUT',
    body: toSaveContractSummaryInput(summary),
  });
  return mapContractSummary(result);
}

export async function deleteContractSummary(opportunityId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/opportunities/${opportunityId}/contract-summary`, {
    method: 'DELETE',
  });
}

export async function deleteEmailDocumentSummary(emailMessageId: string, attachmentId: string): Promise<void> {
  await apiRequest<void>(
    `/api/v1/mailbox/messages/${emailMessageId}/document-summary/attachments/${attachmentId}`,
    {
      method: 'DELETE',
    }
  );
}

export function upsertDocumentSummary(
  summaries: ContractSummary[] | null | undefined,
  persisted: ContractSummary
): ContractSummary[] {
  const attachmentId = persisted.emailAttachmentId;
  const next = (summaries ?? []).filter((row) => row.emailAttachmentId !== attachmentId);
  next.push({ ...persisted, emailMessageId: persisted.emailMessageId ?? undefined });
  return next.sort((left, right) =>
    (left.emailAttachmentId ?? left.id ?? '').localeCompare(right.emailAttachmentId ?? right.id ?? '')
  );
}

export function removeDocumentSummary(
  summaries: ContractSummary[] | null | undefined,
  attachmentId: string
): ContractSummary[] {
  return (summaries ?? []).filter((row) => row.emailAttachmentId !== attachmentId);
}

/** @deprecated use previewContractFromAttachment */
export const summarizeContractFromAttachment = previewContractFromAttachment;
