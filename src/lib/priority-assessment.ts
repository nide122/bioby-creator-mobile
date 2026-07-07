import type { TFunction } from 'i18next';

export type PriorityAssessmentSection = {
  kind: string;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, unknown> | null;
};

export type PriorityAssessmentFactor = {
  code: string;
  labelKey: string;
  valueDisplay?: unknown;
  polarity?: string;
};

export type DealEconomicsView = {
  quoteUsd?: number | null;
  expectedFloorUsd?: number | null;
  expectedTargetUsd?: number | null;
  unitCount?: number;
  economicMarginUsd?: number | null;
  unitRateUsd?: number | null;
  referenceUnitFloorUsd?: number | null;
  valueSortKey?: number | null;
  budgetCertainty?: string | null;
  rateCardMatched?: boolean;
  usedDefaultFloor?: boolean;
};

export type PriorityAssessmentPackageOption = {
  deliverable?: string | null;
  quoteDisplay?: string | null;
  summaryKey?: string | null;
  summaryParams?: Record<string, unknown> | null;
  bestOption?: boolean;
};

export type PriorityAssessmentView = {
  headlineKey?: string | null;
  headlineParams?: Record<string, unknown> | null;
  summaryKey?: string | null;
  summaryParams?: Record<string, unknown> | null;
  urgencySummaryKey?: string | null;
  urgencySummaryParams?: Record<string, unknown> | null;
  packageOptions?: PriorityAssessmentPackageOption[];
  sections?: PriorityAssessmentSection[];
  factors?: PriorityAssessmentFactor[];
  dealEconomics?: DealEconomicsView | null;
  attentionScore?: number | null;
  rulesVersion?: string | null;
};

/** Interpolate i18n templates that use {{param}} placeholders from the API. */
const LEGACY_ASSESSMENT_PARAM_ALIASES: Record<string, string> = {
  [['budget', 'Label'].join('')]: 'optionQuoteDisplay',
  [['best', 'Budget', 'Label'].join('')]: 'bestOptionQuoteDisplay',
};

function normalizeAssessmentParams(
  params?: Record<string, unknown> | null,
): Record<string, unknown> | null | undefined {
  if (!params) return params;
  const out = { ...params };
  for (const [legacy, next] of Object.entries(LEGACY_ASSESSMENT_PARAM_ALIASES)) {
    if (legacy in out && !(next in out)) {
      out[next] = out[legacy];
    }
    delete out[legacy];
  }
  return out;
}

export function renderAssessmentTemplate(
  t: TFunction,
  key: string | null | undefined,
  params?: Record<string, unknown> | null
): string | null {
  if (!key) return null;
  const normalizedParams = normalizeAssessmentParams(params);
  const normalized = Object.fromEntries(
    Object.entries(normalizedParams ?? {}).map(([name, value]) => {
      if (value == null) {
        return [name, ''];
      }
      const text = String(value);
      if (text.startsWith('inboxPriority.') || text.startsWith('inbox.')) {
        return [name, t(text)];
      }
      return [name, text];
    })
  );
  return t(key, normalized);
}
