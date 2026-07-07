import { isActiveEscrowDelivery, type PriorityBandInput } from '@/src/lib/priority-lead-value-band';
import { isOpportunityPathClosed } from '@/src/lib/opportunity-path-step';
import type { InboxPriority, InboxThread, LeadValueBand } from '@/src/types/domain';

export type InboxPriorityInput = PriorityBandInput &
  Pick<InboxThread, 'inboxPriority' | 'priorityScore' | 'valueSortKey'>;

const VISIBLE_PRIORITIES = ['p0', 'p1', 'p2'] as const satisfies readonly InboxPriority[];

/** Escrow / production threads stay in the priority queue even when archived band. */
function escrowUrgentPriority(item: PriorityBandInput): InboxPriority | undefined {
  if (isOpportunityPathClosed(item)) return undefined;
  if (!isActiveEscrowDelivery(item)) return undefined;
  if (item.dealEscrowPhase === 'disputed' || item.dealEscrowPhase === 'remediation') {
    return 'p0';
  }
  if (
    item.dealEscrowPhase === 'pending_verification' ||
    item.pipelinePhase === 'BRAND_REVIEW' ||
    item.pipelinePhase === 'REVISION'
  ) {
    return 'p1';
  }
  return 'p2';
}

/** Resolve the P 档 shown in the Priority tab (P0–P2 only). */
export function resolveDisplayInboxPriority(item: InboxPriorityInput): InboxPriority | undefined {
  const escrowPriority = escrowUrgentPriority(item);
  if (item.priorityScore != null && item.inboxPriority) {
    if (item.inboxPriority === 'p3') {
      return escrowPriority;
    }
    if (item.inboxPriority === 'p0' || item.inboxPriority === 'p1') {
      return item.inboxPriority;
    }
    return escrowPriority ?? item.inboxPriority;
  }

  const legacyBand = legacyBandToPriority(item.leadValueBand);
  if (legacyBand) {
    return escrowPriority && priorityRank(escrowPriority) < priorityRank(legacyBand) ? escrowPriority : legacyBand;
  }
  return escrowPriority;
}

function legacyBandToPriority(band: LeadValueBand | undefined): InboxPriority | undefined {
  switch (band) {
    case 'high_value':
      return 'p1';
    case 'needs_negotiation':
      return 'p2';
    default:
      return undefined;
  }
}

function priorityRank(priority: InboxPriority): number {
  switch (priority) {
    case 'p0':
      return 0;
    case 'p1':
      return 1;
    case 'p2':
      return 2;
    case 'p3':
      return 3;
  }
}

export function countInboxPriorities(
  items: InboxPriorityInput[]
): Record<'p0' | 'p1' | 'p2', number> {
  const counts = { p0: 0, p1: 0, p2: 0 };
  for (const item of items) {
    const priority = resolveDisplayInboxPriority(item);
    if (priority === 'p0' || priority === 'p1' || priority === 'p2') {
      counts[priority] += 1;
    }
  }
  return counts;
}

export function groupThreadsByInboxPriority(items: InboxThread[]): Record<'p0' | 'p1' | 'p2', InboxThread[]> {
  const grouped = { p0: [] as InboxThread[], p1: [] as InboxThread[], p2: [] as InboxThread[] };
  for (const item of items) {
    const priority = resolveDisplayInboxPriority(item);
    if (priority === 'p0' || priority === 'p1' || priority === 'p2') {
      grouped[priority].push(item);
    }
  }
  for (const key of ['p0', 'p1', 'p2'] as const) {
    grouped[key].sort((a: InboxThread, b: InboxThread) => comparePriorityThreads(a, b, key));
  }
  return grouped;
}

function comparePriorityThreads(a: InboxThread, b: InboxThread, bucket: InboxPriority): number {
  if (bucket === 'p0') {
    return Date.parse(b.updatedAtISO) - Date.parse(a.updatedAtISO);
  }
  const marginA = a.valueSortKey ?? a.dealEconomics?.valueSortKey ?? null;
  const marginB = b.valueSortKey ?? b.dealEconomics?.valueSortKey ?? null;
  if (marginA != null && marginB != null && marginB !== marginA) {
    return marginB - marginA;
  }
  if (marginA != null && marginB == null) return -1;
  if (marginA == null && marginB != null) return 1;
  const scoreA = a.priorityScore ?? a.classificationSortScore ?? 0;
  const scoreB = b.priorityScore ?? b.classificationSortScore ?? 0;
  if (scoreB !== scoreA) return scoreB - scoreA;
  return Date.parse(b.updatedAtISO) - Date.parse(a.updatedAtISO);
}

export function countArchivedInboxPriority(items: InboxPriorityInput[]): number {
  let count = 0;
  for (const item of items) {
    if (isOpportunityPathClosed(item)) continue;
    const visible = resolveDisplayInboxPriority(item);
    if (!visible) count += 1;
  }
  return count;
}

export function isEscrowPriorityThread(item: PriorityBandInput): boolean {
  return isActiveEscrowDelivery(item);
}
