import type { DraftDetail, DraftSummary } from '@/src/types/domain';
import { mockDelay } from '@/src/lib/mock-delay';

export const DRAFT_DETAILS: Record<string, DraftDetail> = {
  'draft-reply-01': {
    id: 'draft-reply-01',
    title: 'Clarify usage rights',
    updatedAtISO: new Date().toISOString(),
    kind: 'ai_reply',
    requiresApproval: true,
    sourceThreadId: 'thread-hardware',
    sourceBrandHint: 'TrailPeak Gear',
    nextActionLabel: 'Send after rights review',
    body:
      'Hi, thanks for the clear brief.\n\nBefore I quote, I want to confirm three points:\n' +
      '1) revision rounds and final deliverable format;\n' +
      '2) whether usage is limited to this campaign, or if remix / paid social edits should be priced separately;\n' +
      '3) whether any claims need legal review and whether that review window affects delivery timing.\n\n' +
      'Once confirmed, I can share a structured quote and schedule.',
  },
  'draft-quote-02': {
    id: 'draft-quote-02',
    title: 'Short-form package quote',
    updatedAtISO: new Date().toISOString(),
    kind: 'quote',
    requiresApproval: true,
    sourceThreadId: 'thread-skincare',
    sourceBrandHint: 'ClearSkin Lab',
    nextActionLabel: 'Review quote before send',
    body:
      'Quote summary:\n' +
      '- Package: 2 short-form videos, including 2 script rounds, shoot, and edit\n' +
      '- Default usage: organic campaign use + owned channels for 90 days\n' +
      '- Add-ons: remix, paid social edits, or long-term usage\n' +
      '- Timing: confirmed once scope is locked\n\n' +
      'This is a draft quote, not a final agreement.',
  },
  'draft-follow-03': {
    id: 'draft-follow-03',
    title: '48h follow-up',
    updatedAtISO: new Date().toISOString(),
    kind: 'follow_up',
    requiresApproval: false,
    sourceThreadId: 'thread-skincare',
    sourceBrandHint: 'ClearSkin Lab',
    nextActionLabel: 'Mark checked before follow-up',
    body:
      'Hi, just checking in since it has been over 48 hours.\n\n' +
      'Are you still looking to move forward with the quote? If timing or budget changed, feel free to reply here and I will update the draft.',
  },
};

function draftToSummary(detail: DraftDetail): DraftSummary {
  const { body: _b, sourceThreadId: _st, ...rest } = detail;
  return rest;
}

export async function fetchMockDrafts(options?: { empty?: boolean }): Promise<DraftSummary[]> {
  await mockDelay(150);
  if (options?.empty) return [];
  return Object.values(DRAFT_DETAILS).map(draftToSummary);
}

export async function fetchMockDraftDetail(id: string): Promise<DraftDetail> {
  await mockDelay(120);
  const detail = DRAFT_DETAILS[id];
  if (!detail) {
    throw new Error(`draft_not_found:${id}`);
  }
  return { ...detail };
}
