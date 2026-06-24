import type { DealTermRow } from '@/src/types/deal-workflow';
import type { DealSummary, InboxThreadDetail } from '@/src/types/domain';

export type DealPanelTermLine = {
  id: string;
  label: string;
  value: string;
};

/** Merge deliverable lines from opportunity thread, packet, and contract summary. */
export function mergeDealPanelDeliverables(
  thread: InboxThreadDetail | undefined,
  packetRows: DealTermRow[],
  contractDeliverables: string[] | undefined,
  formatPacketRow: (row: DealTermRow) => string,
): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  const add = (raw: string | undefined | null) => {
    const value = raw?.trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(value);
  };

  thread?.deliverables?.forEach(add);
  contractDeliverables?.forEach(add);
  packetRows.forEach((row) => add(formatPacketRow(row)));
  return lines;
}

export function buildDealPanelTermLines(
  deal: DealSummary,
  thread: InboxThreadDetail | undefined,
): DealPanelTermLine[] {
  const lines: DealPanelTermLine[] = [];
  const budget = thread?.budgetLabel ?? deal.recommendPayoutNote;
  if (budget?.trim()) {
    lines.push({ id: 'budget', label: 'budget', value: budget.trim() });
  }
  if (thread?.postingSchedule?.trim()) {
    lines.push({ id: 'posting', label: 'posting', value: thread.postingSchedule.trim() });
  }
  return lines;
}

export function dealPanelQuickHref(deal: DealSummary): string {
  switch (deal.escrowPhase) {
    case 'pending_verification':
      return `/deal/${deal.id}/verification`;
    case 'in_execution':
    case 'escrowed':
    case 'remediation':
    case 'disputed':
      return `/deal/${deal.id}/delivery`;
    case 'awaiting_prepay':
      return `/deal/${deal.id}`;
    default:
      return `/deal/${deal.id}`;
  }
}

export function dealPanelQuickLabelKey(deal: DealSummary): string {
  switch (deal.escrowPhase) {
    case 'pending_verification':
      return 'dealsScreen.uploadProof';
    case 'in_execution':
    case 'escrowed':
      return 'dealsScreen.viewDelivery';
    case 'remediation':
    case 'disputed':
      return 'dealsScreen.resolveDispute';
    case 'awaiting_prepay':
      return 'dealsScreen.reviewPacket';
    default:
      return 'dealsScreen.openDealCta';
  }
}
