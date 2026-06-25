import type { TFunction } from 'i18next';

import { localizeDecisionActionReasonMessage } from '@/src/lib/decision-card-i18n';
import type { InboxRiskFlag } from '@/src/types/domain';

const RECOMMENDED_ACTION_KEYS: Record<string, string> = {
  'Ask for budget range before quoting.': 'inboxThreadDetail.recommendedActions.askBudget',
  'Clarify usage scope, territory, and duration.': 'inboxThreadDetail.recommendedActions.clarifyUsage',
  'Confirm deliverable format and count.': 'inboxThreadDetail.recommendedActions.confirmDeliverables',
  'Review extracted brief and reply with clarifying questions.':
    'inboxThreadDetail.recommendedActions.reviewBrief',
  'Counter with rate-card floor or reduced scope.': 'inboxThreadDetail.recommendedActions.counterFloor',
  'Split base deliverables from extended usage add-ons.':
    'inboxThreadDetail.recommendedActions.splitUsage',
  '确认独家、置顶、展示期限和二次使用范围后再报价。':
    'inboxThreadDetail.recommendedActions.confirmExclusiveTerms',
};

const MISSING_FIELD_KEYS: Record<string, string> = {
  budget: 'inboxThreadDetail.missingField.budget',
  deliverables: 'inboxThreadDetail.missingField.deliverables',
  usageRights: 'inboxThreadDetail.missingField.usageRights',
  postingSchedule: 'inboxThreadDetail.missingField.postingSchedule',
};

const DETAIL_SIGNAL_KEYS: Record<string, string> = {
  'paid campaign': 'paidCampaign',
  'Budget mentioned': 'budgetMentioned',
  '提及预算': 'budgetMentioned',
  'Quote given': 'quoteGiven',
  '报价已给出': 'quoteGiven',
  'Quote or rate mentioned': 'quoteMentioned',
  '提及报价或费率': 'quoteMentioned',
  'Budget inquiry mentioned': 'budgetInquiry',
  '提及预算询价': 'budgetInquiry',
  'Exclusive collaboration requested': 'exclusiveCollab',
  '独家合作诉求': 'exclusiveCollab',
  'Disclosure requirement mentioned': 'disclosureRequired',
  '提及广告披露要求': 'disclosureRequired',
  'Script, shoot details, and talking points to align': 'scriptAlignment',
  '需沟通脚本、拍摄细节和推广要点': 'scriptAlignment',
  'Brand review before publish': 'brandReview',
  '品牌方要求定稿审核': 'brandReview',
  'Revision rounds referenced': 'revisionRounds',
  '提及修改轮次': 'revisionRounds',
  'Deadline near': 'deadlineNear',
  '时间较紧': 'deadlineNear',
};

const RISK_LABEL_KEYS: Record<string, string> = {
  'Risky usage language': 'dangerUsage',
  '授权条款有风险': 'dangerUsage',
  'Broad usage requested': 'broadUsage',
  '授权范围过宽': 'broadUsage',
  'Broad usage scope': 'broadUsage',
  'High risk · Terms': 'highRiskTerms',
  '高风险 · 条款': 'highRiskTerms',
  'Medium risk · Usage': 'mediumRiskUsage',
  '中风险 · 授权': 'mediumRiskUsage',
  'Budget unclear': 'budgetUnclear',
  '预算不清楚': 'budgetUnclear',
  '预算不明确': 'budgetUnclear',
  '预算范围不清楚': 'budgetUnclear',
  'Usage scope unclear': 'usageScopeUnclear',
  '授权范围不清楚': 'usageScopeUnclear',
  'Below your floor rate': 'belowFloor',
  '低于你的底价': 'belowFloor',
  'Near your floor rate': 'nearFloor',
  '接近底价': 'nearFloor',
  'Deadline soon': 'deadlineSoon',
  'Claims review needed': 'claimsReview',
  'Early collaboration — verify terms': 'earlyCollab',
  '初次合作 · 先核对条款': 'earlyCollab',
  'Multiple packages quoted': 'multiplePackages',
  '多个报价方案': 'multiplePackages',
};

const RISK_HINT_KEYS: Record<string, string> = {
  'Confirm scope before quoting.': 'confirmScopeBeforeQuote',
  '报价前先确认范围。': 'confirmScopeBeforeQuote',
  'Split base deliverables from extended usage add-ons.': 'splitUsageAddOns',
  '区分基础交付与扩展授权加价项。': 'splitUsageAddOns',
  'Confirm paid amplification scope and duration before agreeing.': 'confirmSparkAds',
  '同意前先确认付费加热范围与时长。': 'confirmSparkAds',
  'Ask for organic vs paid usage, territory, and duration before quoting.': 'usageScopeUnclear',
  '报价前确认自然流/付费投放、地域与时长。': 'usageScopeUnclear',
  'Ask for a clear budget or rate before sending a quote.': 'missingBudget',
  '发送报价前先确认明确预算或费率。': 'missingBudget',
  'Confirm which deliverable and quote applies before replying.': 'multiplePackages',
  '回复前确认适用哪条交付与报价。': 'multiplePackages',
  'First-touch outreach: confirm deliverables, usage, timeline, and payment before committing.':
    'earlyCollab',
  '首次询盘：先确认交付、授权、时间与付款，再承诺合作。': 'earlyCollab',
};

const ACTION_REASON_CODE_KEYS: Record<string, string> = {
  DANGER_TERMS: 'dangerTerms',
  BROAD_USAGE: 'broadUsage',
  DEADLINE_48H: 'deadline48h',
  CLAIMS_REVIEW: 'claimsReview',
  MISSING_BUDGET: 'missingBudget',
  EXCEPTIONAL_BUDGET: 'exceptionalBudget',
  NO_RATE_CARD_FLOOR: 'noRateCardFloor',
  BELOW_FLOOR_RATE: 'belowFloorRate',
  NEAR_FLOOR_RATE: 'nearFloorRate',
};

const DELIVERABLE_PREFIX = /^(?:Deliverable|交付)[：:]\s*(.+)$/i;
const USAGE_PREFIX = /^(?:Usage|授权)[：:]\s*(.+)$/i;
const BUDGET_PREFIX = /^(?:Budget|预算)[：:]\s*(.+)$/i;

function mapLocalizedCopy(
  text: string | undefined,
  table: Record<string, string>,
  namespace: string,
  t: TFunction
): string | undefined {
  if (!text?.trim()) return text;
  const trimmed = text.trim();
  const key = table[trimmed];
  return key ? t(`${namespace}.${key}`) : undefined;
}

export function translateRecommendedAction(t: TFunction, action: string): string {
  const key = RECOMMENDED_ACTION_KEYS[action.trim()];
  return key ? t(key) : action;
}

export function translateMissingField(t: TFunction, field: string): string {
  const key = MISSING_FIELD_KEYS[field.trim()];
  return key ? t(key) : field;
}

export function translateDetailSignal(t: TFunction, signal: string): string {
  const trimmed = signal.trim();
  if (!trimmed) return signal;

  const exact = mapLocalizedCopy(trimmed, DETAIL_SIGNAL_KEYS, 'inboxThreadDetail.signals', t);
  if (exact) return exact;

  const localizedReason = localizeDecisionActionReasonMessage(trimmed, t);
  if (localizedReason && localizedReason !== trimmed) return localizedReason;

  const deliverable = trimmed.match(DELIVERABLE_PREFIX);
  if (deliverable) return t('inboxThreadDetail.signals.deliverable', { value: deliverable[1].trim() });

  const usage = trimmed.match(USAGE_PREFIX);
  if (usage) return t('inboxThreadDetail.signals.usage', { value: usage[1].trim() });

  const budget = trimmed.match(BUDGET_PREFIX);
  if (budget) return t('inboxThreadDetail.signals.budget', { value: budget[1].trim() });

  return signal;
}

export function translateRiskLabelText(t: TFunction, label: string | undefined): string | undefined {
  if (!label?.trim()) return label;
  const trimmed = label.trim();
  const mapped = mapLocalizedCopy(trimmed, RISK_LABEL_KEYS, 'inboxThreadDetail.riskLabels', t);
  if (mapped) return mapped;
  const localizedReason = localizeDecisionActionReasonMessage(trimmed, t);
  return localizedReason && localizedReason !== trimmed ? localizedReason : label;
}

export function translateRiskFlagLabel(t: TFunction, label: string): string {
  return translateRiskLabelText(t, label) ?? label;
}

export function translateRiskFlagHint(t: TFunction, hint: string): string {
  const trimmed = hint.trim();
  const mapped = mapLocalizedCopy(trimmed, RISK_HINT_KEYS, 'inboxThreadDetail.riskHints', t);
  if (mapped) return mapped;
  const localizedReason = localizeDecisionActionReasonMessage(trimmed, t);
  return localizedReason && localizedReason !== trimmed ? localizedReason : hint;
}

export function translateActionReason(
  t: TFunction,
  reason: { code: string; message: string }
): string {
  const localized = localizeDecisionActionReasonMessage(reason.message, t);
  if (localized && localized !== reason.message) return localized;
  const codeKey = ACTION_REASON_CODE_KEYS[reason.code];
  if (codeKey) return t(`decisionCard.actionReason.${codeKey}`);
  return reason.message;
}

export function localizeRiskFlag(flag: InboxRiskFlag, t: TFunction): InboxRiskFlag {
  return {
    ...flag,
    label: translateRiskFlagLabel(t, flag.label),
    hint: flag.hint ? translateRiskFlagHint(t, flag.hint) : flag.hint,
  };
}

/** Creator-facing attention line: prefer the actionable hint over a headline label. */
export function attentionItemText(flag: InboxRiskFlag, t: TFunction): string {
  const localized = localizeRiskFlag(flag, t);
  if (localized.hint?.trim()) return localized.hint.trim();
  return localized.label;
}

export type AttentionListItem = {
  id: string;
  text: string;
};

function normalizeAttentionKey(text: string): string {
  return text.trim().toLowerCase().replace(/[。．.!！?？\s]+$/g, '');
}

/** Merge AI reply suggestions and rule-detected gaps into one deduplicated list. */
export function buildAttentionList(
  actions: string[],
  flags: InboxRiskFlag[],
  t: TFunction,
  fallbackText?: string | null
): AttentionListItem[] {
  const items: AttentionListItem[] = [];
  const seen = new Set<string>();

  const add = (text: string, meta: Omit<AttentionListItem, 'text'>) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = normalizeAttentionKey(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ ...meta, text: trimmed });
  };

  for (const action of meaningfulRecommendedActions(actions)) {
    add(translateRecommendedAction(t, action), { id: `action-${items.length}` });
  }
  for (const flag of flags) {
    add(attentionItemText(flag, t), { id: flag.id });
  }
  if (fallbackText?.trim()) {
    add(fallbackText, { id: 'attention-fallback' });
  }
  return items;
}

export function filterSignalsApartFromAttention(
  signals: string[],
  attentionItems: AttentionListItem[]
): string[] {
  const attentionKeys = new Set(attentionItems.map((item) => normalizeAttentionKey(item.text)));
  return signals.filter((signal) => !attentionKeys.has(normalizeAttentionKey(signal)));
}

export function formatDangerAcknowledgementMessage(flags: InboxRiskFlag[], t: TFunction): string {
  return flags
    .filter((flag) => flag.severity === 'danger')
    .map((flag) => `· ${attentionItemText(flag, t)}`)
    .join('\n');
}

export function mergeDetailSignals(
  signals: string[] | undefined,
  classificationSignals: string[] | undefined
): string[] {
  const merged = new Set<string>();
  for (const value of [...(signals ?? []), ...(classificationSignals ?? [])]) {
    const trimmed = value.trim();
    if (trimmed) merged.add(trimmed);
  }
  return Array.from(merged);
}

export function isUnclearBudgetLabel(label?: string | null): boolean {
  if (!label?.trim()) return true;
  const normalized = label.trim().toLowerCase();
  return (
    normalized === 'budget unclear' ||
    normalized === '预算不清楚' ||
    normalized === '预算不明确' ||
    normalized === '预算范围不清楚' ||
    normalized.startsWith('extracting')
  );
}

export function visibleMissingFields(
  missingFields: string[] | undefined,
  budgetLabel?: string | null
): string[] {
  if (!missingFields?.length) return [];
  return missingFields.filter((field) => {
    if (field === 'budget' && !isUnclearBudgetLabel(budgetLabel)) return false;
    return true;
  });
}

export function isStaleBudgetUnclearRisk(label?: string | null): boolean {
  if (!label?.trim()) return false;
  const normalized = label.trim().toLowerCase();
  return normalized === 'budget unclear' || normalized.includes('预算不清楚') || normalized.includes('预算不明确');
}

export function visibleRiskFlags(
  riskFlags: InboxRiskFlag[],
  budgetLabel?: string | null
): InboxRiskFlag[] {
  if (!isUnclearBudgetLabel(budgetLabel)) {
    return riskFlags.filter((flag) => !isStaleBudgetUnclearRisk(flag.label));
  }
  return riskFlags;
}

export function visibleRiskLabel(riskLabel: string | undefined, budgetLabel?: string | null): string | undefined {
  if (!riskLabel) return undefined;
  if (isStaleBudgetUnclearRisk(riskLabel) && !isUnclearBudgetLabel(budgetLabel)) {
    return undefined;
  }
  return riskLabel;
}

export function localizedVisibleRiskLabel(
  t: TFunction,
  riskLabel: string | undefined,
  budgetLabel?: string | null
): string | undefined {
  const visible = visibleRiskLabel(riskLabel, budgetLabel);
  return visible ? translateRiskLabelText(t, visible) : undefined;
}

export function isGenericRecommendedAction(action: string): boolean {
  const trimmed = action.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return lower.includes('review extracted brief') || lower === 'review and reply';
}

export function meaningfulRecommendedActions(actions: string[]): string[] {
  return actions.filter((action) => !isGenericRecommendedAction(action));
}

export function commercialAttentionFallback(
  isCommercial: boolean,
  briefComplete: boolean,
  riskFlags: InboxRiskFlag[],
  recommendedActions: string[],
  attentionCount?: number
): boolean {
  if (attentionCount != null) {
    return false;
  }
  if (!isCommercial || !briefComplete) {
    return false;
  }
  return riskFlags.length === 0 && meaningfulRecommendedActions(recommendedActions).length === 0;
}

export function resolveAttentionCount(
  attentionCount: number | undefined,
  riskFlags: InboxRiskFlag[],
  recommendedActions: string[],
  showFallback = false
): number {
  if (attentionCount != null) {
    return attentionCount;
  }
  const computed = riskFlags.length + meaningfulRecommendedActions(recommendedActions).length;
  if (computed > 0) {
    return computed;
  }
  return showFallback ? 1 : 0;
}
