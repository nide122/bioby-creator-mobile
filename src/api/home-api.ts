import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { AiActionLogEntry, AiActionKind } from '@/src/types/domain';

export type InboxSummary = {
  processedCount: number;
  commercialCount: number;
  needsActionCount: number;
  archivedCount: number;
};

const ACTION_KINDS: AiActionKind[] = [
  'classified',
  'archived',
  'risk_flagged',
  'drafted',
  'recommended',
  'corrected',
];

function asActionKind(value: string): AiActionKind {
  return ACTION_KINDS.includes(value as AiActionKind) ? (value as AiActionKind) : 'classified';
}

export async function fetchInboxSummary(): Promise<InboxSummary> {
  if (!shouldUseBackendApi()) {
    const { fetchMockAiDailySummary } = await import('@/src/api/mock-inbox');
    return fetchMockAiDailySummary();
  }
  return apiRequest<InboxSummary>('/api/v1/home/inbox-summary');
}

export async function fetchAiActionLog(): Promise<AiActionLogEntry[]> {
  if (!shouldUseBackendApi()) {
    const { buildMockAiActionLog } = await import('@/src/api/mock-ai-actions');
    return buildMockAiActionLog({});
  }
  const rows = await apiRequest<
    Array<{
      id: string;
      kind: string;
      title: string;
      description: string;
      occurredAtISO: string;
      sourceHref?: string | null;
    }>
  >('/api/v1/home/action-log');
  return rows.map((row) => ({
    id: row.id,
    kind: asActionKind(row.kind),
    title: row.title,
    description: row.description,
    occurredAtISO: row.occurredAtISO,
    sourceHref: row.sourceHref ?? undefined,
  }));
}
