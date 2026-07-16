import type { TFunction } from 'i18next';

import type { DealEconomicsView, PriorityAssessmentView } from '@/src/lib/priority-assessment';
import type { InboxPriority, LeadValueBand, PriorityBreakdown } from '@/src/types/domain';

export type ExplainSection = {
  title: string;
  lines: string[];
};

export type UserPriorityExplain = {
  tierLabel: string;
  sections: ExplainSection[];
  footnote: string | null;
};

function formatMoney(amount: number | null | undefined): string | null {
  if (amount == null || Number.isNaN(amount)) {
    return null;
  }
  return `$${Math.round(Math.abs(amount)).toLocaleString('en-US')}`;
}

function marginAmount(
  quote: number | null | undefined,
  baseline: number | null | undefined
): number | null {
  if (quote == null || baseline == null || Number.isNaN(quote) || Number.isNaN(baseline)) {
    return null;
  }
  return quote - baseline;
}

function tierLabelFor(t: TFunction, inboxPriority: InboxPriority | undefined): string {
  if (!inboxPriority) {
    return t('inboxPriority.explain.tier.unknown');
  }
  return t(`inboxPriority.explain.tier.${inboxPriority}`);
}

function buildUrgencyLine(t: TFunction, assessment: PriorityAssessmentView | null | undefined): string {
  const params = assessment?.urgencySummaryParams ?? {};
  const hint = typeof params.deadlineHint === 'string' ? params.deadlineHint.trim() : '';
  const hoursRemaining = toPositiveInt(params.hoursRemaining);
  const daysOverdue = toPositiveInt(params.daysOverdue);
  const hoursAgo = toPositiveInt(params.hoursAgo);

  if (hint && hoursRemaining != null) {
    return t('inboxPriority.explain.urgency.deadlineWithHintAndHours', { hint, hours: hoursRemaining });
  }
  if (hint && daysOverdue != null) {
    return t('inboxPriority.explain.urgency.deadlineWithHintOverdue', { hint, days: daysOverdue });
  }
  if (hint) {
    return t('inboxPriority.explain.urgency.deadlineWithHint', { hint });
  }
  if (hoursRemaining != null) {
    return t('inboxPriority.explain.urgency.deadlineHours', { hours: hoursRemaining });
  }
  if (daysOverdue != null) {
    return t('inboxPriority.explain.urgency.deadlineOverdue', { days: daysOverdue });
  }
  if (hoursAgo != null) {
    return t('inboxPriority.explain.urgency.needsReply', { hours: hoursAgo });
  }
  return t('inboxPriority.explain.urgency.generic');
}

function toPositiveInt(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
}

function buildValueLine(input: {
  t: TFunction;
  inboxPriority?: InboxPriority;
  leadValueBand?: LeadValueBand;
  economics: DealEconomicsView | null | undefined;
}): string | null {
  const { t, inboxPriority, leadValueBand, economics } = input;

  if (inboxPriority === 'p3') {
    return t('inboxPriority.explain.value.p3');
  }

  const quote = formatMoney(economics?.quoteUsd);
  const floor = formatMoney(economics?.expectedFloorUsd);
  const target = formatMoney(economics?.expectedTargetUsd);
  const budgetUnknown = !quote || economics?.budgetCertainty === 'unknown';

  if (budgetUnknown) {
    return t('inboxPriority.explain.value.unknown');
  }

  const vsTarget = marginAmount(economics?.quoteUsd, economics?.expectedTargetUsd);
  const vsFloor = marginAmount(economics?.quoteUsd, economics?.expectedFloorUsd);

  if (vsFloor != null && vsFloor < 0 && floor) {
    return t('inboxPriority.explain.value.belowFloor', {
      quote,
      floor,
      shortfall: formatMoney(Math.abs(vsFloor)),
    });
  }

  // Quote at/above target is never "between floor and target" — including when still P2
  // for non-price reasons (stale classify, urgency, etc.).
  if (target && vsTarget != null && vsTarget >= 0) {
    if (vsTarget > 0) {
      return t('inboxPriority.explain.value.aboveTarget', {
        quote,
        target,
        delta: formatMoney(vsTarget),
      });
    }
    return t('inboxPriority.explain.value.atTarget', { quote, target });
  }

  if (floor && target) {
    return t('inboxPriority.explain.value.inRange', { quote, floor, target });
  }

  if (leadValueBand === 'needs_negotiation') {
    return t('inboxPriority.explain.value.needsWork', { quote });
  }

  return quote ? t('inboxPriority.explain.value.simple', { quote }) : null;
}

function buildMatchLines(t: TFunction, breakdown: PriorityBreakdown | null | undefined): string[] {
  if (!breakdown) {
    return [t('inboxPriority.explain.match.unavailable')];
  }

  const lines: string[] = [
    t(dimensionKey('brand', breakdown.brandFit, false)),
    t(dimensionKey('timeline', breakdown.timelineUrgency, false)),
    t(dimensionKey('relationship', breakdown.relationshipValue, false)),
    t(dimensionKey('risk', breakdown.risk, false)),
  ];

  return lines;
}

function dimensionKey(
  dimension: 'brand' | 'timeline' | 'relationship' | 'risk',
  score: number,
  invert: boolean
): string {
  const effective = invert ? 100 - score : score;
  const level = effective >= 70 ? 'high' : effective >= 40 ? 'mid' : 'low';
  return `inboxPriority.explain.match.${dimension}.${level}`;
}

function buildSortLine(input: {
  t: TFunction;
  inboxPriority?: InboxPriority;
  economics: DealEconomicsView | null | undefined;
}): string {
  const { t, inboxPriority, economics } = input;

  if (inboxPriority === 'p0') {
    return t('inboxPriority.explain.order.p0');
  }
  if (inboxPriority === 'p3') {
    return t('inboxPriority.explain.order.p3');
  }

  const margin = economics?.economicMarginUsd ?? economics?.valueSortKey ?? null;
  const headroom = formatMoney(margin != null ? Math.abs(margin) : null);

  if (margin != null && margin > 0 && headroom) {
    return t('inboxPriority.explain.order.byHeadroom', { headroom });
  }
  if (margin != null && margin < 0 && headroom) {
    return t('inboxPriority.explain.order.byShortfall', { shortfall: headroom });
  }
  if (margin === 0) {
    return t('inboxPriority.explain.order.even');
  }
  return t('inboxPriority.explain.order.fallback');
}

function buildPackageNote(
  t: TFunction,
  assessment: PriorityAssessmentView | null | undefined
): string | null {
  const best = assessment?.packageOptions?.find((option) => option.bestOption);
  if (!best) {
    return null;
  }
  const deliverable = best.deliverable?.trim() || t('inboxPriority.explain.package.unnamed');
  const quote = best.quoteDisplay?.trim();
  if (!quote) {
    return t('inboxPriority.explain.package.bestUnnamed', { deliverable });
  }
  return t('inboxPriority.explain.package.best', { deliverable, quote });
}

function buildFootnote(t: TFunction, economics: DealEconomicsView | null | undefined): string | null {
  if (economics?.usedDefaultFloor) {
    return t('inboxPriority.explain.footnoteDefaultFloor');
  }
  if (economics?.rateCardMatched === false && economics.expectedFloorUsd != null) {
    return t('inboxPriority.explain.footnoteNoRateCard');
  }
  return null;
}

export function buildPlainPriorityExplain(input: {
  t: TFunction;
  inboxPriority?: InboxPriority;
  assessment?: PriorityAssessmentView | null;
  breakdown?: PriorityBreakdown | null;
  dealEconomics?: DealEconomicsView | null;
  leadValueBand?: LeadValueBand;
}): UserPriorityExplain | null {
  const { t, inboxPriority, assessment, breakdown, dealEconomics, leadValueBand } = input;
  if (!inboxPriority && !assessment && !breakdown && !dealEconomics) {
    return null;
  }

  const economics = dealEconomics ?? assessment?.dealEconomics ?? null;
  const sections: ExplainSection[] = [];

  if (inboxPriority === 'p0') {
    sections.push({
      title: t('inboxPriority.explain.section.urgency'),
      lines: [buildUrgencyLine(t, assessment)],
    });
  }

  const valueLine = buildValueLine({ t, inboxPriority, leadValueBand, economics });
  if (valueLine) {
    sections.push({
      title: t('inboxPriority.explain.section.value'),
      lines: [valueLine],
    });
  }

  const packageNote = buildPackageNote(t, assessment);
  if (packageNote) {
    const valueSection = sections.find((section) => section.title === t('inboxPriority.explain.section.value'));
    if (valueSection) {
      valueSection.lines.push(packageNote);
    } else {
      sections.push({
        title: t('inboxPriority.explain.section.value'),
        lines: [packageNote],
      });
    }
  }

  if (inboxPriority !== 'p3') {
    sections.push({
      title: t('inboxPriority.explain.section.match'),
      lines: buildMatchLines(t, breakdown),
    });
  }

  sections.push({
    title: t('inboxPriority.explain.section.order'),
    lines: [buildSortLine({ t, inboxPriority, economics })],
  });

  return {
    tierLabel: tierLabelFor(t, inboxPriority),
    sections,
    footnote: buildFootnote(t, economics),
  };
}

/** @deprecated Use UserPriorityExplain */
export type PlainPriorityExplain = UserPriorityExplain;
