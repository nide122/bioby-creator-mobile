import type { DecisionAction, DecisionCard } from '@/src/types/domain';
import { isEmailLikeLabel } from '@/src/lib/cooperation-display-name';

export type ParsedDecisionSourceHint = {
  prefix?: string;
  detail?: string;
};

export type DecisionCardDisplay = {
  brand: string;
  /** Opportunity / deal / draft title when available */
  subject?: string;
  /** Headline when it adds action context beyond brand + subject */
  actionSummary?: string;
  primaryAction?: DecisionAction;
  urgencyLabel?: string;
};

const SOURCE_HINT_SEPARATOR = ' · ';

export function parseDecisionSourceHint(sourceHint?: string): ParsedDecisionSourceHint {
  if (!sourceHint?.trim()) return {};
  const separatorIndex = sourceHint.indexOf(SOURCE_HINT_SEPARATOR);
  if (separatorIndex === -1) return { detail: sourceHint.trim() };
  const prefix = sourceHint.slice(0, separatorIndex).trim();
  const detail = sourceHint.slice(separatorIndex + SOURCE_HINT_SEPARATOR.length).trim();
  return {
    prefix: prefix || undefined,
    detail: detail || undefined,
  };
}

export function resolveDecisionPrimaryAction(card: DecisionCard): DecisionAction | undefined {
  return card.actions.find((action) => action.style === 'primary') ?? card.actions[0];
}

export function resolveDecisionUrgencyLabel(card: DecisionCard): string | undefined {
  return card.urgencyNote?.trim() || card.interruptReason?.trim() || undefined;
}

const GENERIC_DRAFT_HEADLINES = new Set([
  'review quote draft',
  'review follow-up draft',
  'review reply draft',
]);

function headlineIsBrandOnlyAction(headline: string, brand: string): boolean {
  const normalizedHeadline = headline.trim().toLowerCase();
  const normalizedBrand = brand.trim().toLowerCase();
  if (!normalizedBrand) return false;
  return (
    normalizedHeadline === `decide on ${normalizedBrand} pitch` ||
    normalizedHeadline === `follow up with ${normalizedBrand}` ||
    normalizedHeadline === `follow up on ${normalizedBrand} delivery` ||
    normalizedHeadline.startsWith(`approve verification for `) ||
    normalizedHeadline.startsWith(`submit verification for `)
  );
}

function headlineIsGenericDraftReview(headline: string): boolean {
  return GENERIC_DRAFT_HEADLINES.has(headline.trim().toLowerCase());
}

export function resolveDecisionCardDisplay(card: DecisionCard): DecisionCardDisplay {
  const { detail: subjectFromSource } = parseDecisionSourceHint(card.sourceHint);
  const rawBrand = card.entityName.trim();
  const brand =
    isEmailLikeLabel(rawBrand) && subjectFromSource ? subjectFromSource.trim() : rawBrand;
  const headline = card.headline.trim();
  const subject = subjectFromSource || (headline && !headlineIsBrandOnlyAction(headline, brand) ? headline : undefined);
  const actionSummary =
    subjectFromSource &&
    headline &&
    !headlineIsBrandOnlyAction(headline, brand) &&
    !headlineIsGenericDraftReview(headline)
      ? headline
      : undefined;

  return {
    brand,
    subject,
    actionSummary,
    primaryAction: resolveDecisionPrimaryAction(card),
    urgencyLabel: resolveDecisionUrgencyLabel(card),
  };
}

/** 与收件箱商业行一致：仅展示 claimedBrandName。 */
export function decisionCardBrandLabel(
  card: Pick<DecisionCard, 'category' | 'claimedBrandName'>,
): string | null {
  if (card.category !== 'opportunity') return null;
  const label = card.claimedBrandName?.trim();
  return label || null;
}

export function decisionCardSubject(card: Pick<DecisionCard, 'sourceHint'>): string | undefined {
  return parseDecisionSourceHint(card.sourceHint).detail;
}

export function formatDecisionQueuePreviewLines(card: DecisionCard): { title: string; subtitle: string } {
  const display = resolveDecisionCardDisplay(card);
  const title = display.brand;
  const subtitleParts: string[] = [];
  if (display.subject) subtitleParts.push(display.subject);
  else if (display.actionSummary) subtitleParts.push(display.actionSummary);
  if (display.primaryAction?.label) subtitleParts.push(display.primaryAction.label);
  if (display.urgencyLabel) subtitleParts.push(display.urgencyLabel);
  return {
    title,
    subtitle: subtitleParts.join(' · ') || display.brand,
  };
}

export function formatDecisionQueuePreviewSubtitle(card: DecisionCard, nextStepLabel: string): string {
  const display = resolveDecisionCardDisplay(card);
  const parts = [display.brand];
  if (display.subject) parts.push(display.subject);
  parts.push(nextStepLabel);
  return parts.join(' · ');
}
