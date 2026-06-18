import type {
  DealDeliveryStep,
  DealPacketContent,
  DealPacketView,
  DealTermRow,
  DealVerificationEvidence,
} from '@/src/types/deal-workflow';

type JsonObject = Record<string, unknown>;

function asDeliveryStatus(value: string): DealDeliveryStep['status'] {
  if (value === 'done' || value === 'current' || value === 'blocked' || value === 'upcoming') {
    return value;
  }
  return 'upcoming';
}

function asEvidenceStatus(value: string): DealVerificationEvidence['status'] {
  if (value === 'done' || value === 'reviewing' || value === 'missing') return value;
  return 'missing';
}

function parseTermRows(raw: unknown): DealTermRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as JsonObject;
      const label = String(row.label ?? '');
      const value = String(row.value ?? '');
      if (!label) return null;
      return { label, value };
    })
    .filter((row): row is DealTermRow => row != null);
}

function parseDelivery(raw: unknown): DealPacketContent['delivery'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const node = raw as JsonObject;
  const timeline = Array.isArray(node.timeline)
    ? node.timeline
        .map((item) => {
          const step = item as JsonObject;
          const id = String(step.id ?? '');
          const title = String(step.title ?? '');
          if (!id || !title) return null;
          return {
            id,
            title,
            due: String(step.due ?? ''),
            status: asDeliveryStatus(String(step.status ?? 'upcoming')),
            owner: String(step.owner ?? ''),
            note: String(step.note ?? ''),
          };
        })
        .filter((s): s is DealDeliveryStep => s != null)
    : [];
  const uploads = Array.isArray(node.uploads)
    ? node.uploads
        .map((item) => {
          const row = item as JsonObject;
          const id = String(row.id ?? '');
          const title = String(row.title ?? '');
          if (!id || !title) return null;
          return { id, title, state: String(row.state ?? '') };
        })
        .filter((r): r is NonNullable<typeof r> => r != null)
    : [];
  if (timeline.length === 0 && uploads.length === 0) return undefined;
  return {
    timeline,
    uploads,
    feedbackNote: node.feedbackNote != null ? String(node.feedbackNote) : undefined,
  };
}

function parseVerification(raw: unknown): DealPacketContent['verification'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const node = raw as JsonObject;
  const evidence = Array.isArray(node.evidence)
    ? node.evidence
        .map((item) => {
          const row = item as JsonObject;
          const id = String(row.id ?? '');
          if (!id) return null;
          return { id, status: asEvidenceStatus(String(row.status ?? 'missing')) };
        })
        .filter((e): e is DealVerificationEvidence => e != null)
    : [];
  const checklist = Array.isArray(node.checklist)
    ? node.checklist
        .map((item) => {
          const row = item as JsonObject;
          const id = String(row.id ?? '');
          if (!id) return null;
          return { id, passed: Boolean(row.passed) };
        })
        .filter((c): c is NonNullable<typeof c> => c != null)
    : [];
  if (evidence.length === 0 && checklist.length === 0) return undefined;
  return {
    evidence,
    checklist,
    payoutHint: node.payoutHint != null ? String(node.payoutHint) : undefined,
    submittedAt: node.submittedAt != null ? String(node.submittedAt) : undefined,
    brandReviewStatus:
      node.brandReviewStatus === 'pending' || node.brandReviewStatus === 'approved'
        ? node.brandReviewStatus
        : undefined,
    brandApprovedAt: node.brandApprovedAt != null ? String(node.brandApprovedAt) : undefined,
  };
}

export function parseDealPacketPayload(packet: unknown): DealPacketContent {
  if (!packet || typeof packet !== 'object') {
    return { deliverables: [] };
  }
  const node = packet as JsonObject;
  return {
    summary: node.summary != null ? String(node.summary) : undefined,
    deliverables: parseTermRows(node.deliverables),
    delivery: parseDelivery(node.delivery),
    verification: parseVerification(node.verification),
  };
}

export function mapDealPacketDto(dto: {
  dealId: string;
  title: string;
  brandPlaceholder: string;
  packet: unknown;
}): DealPacketView {
  return {
    dealId: dto.dealId,
    title: dto.title,
    brandPlaceholder: dto.brandPlaceholder,
    packet: parseDealPacketPayload(dto.packet),
  };
}
