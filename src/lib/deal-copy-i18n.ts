import type { TFunction } from 'i18next';

import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';
import type { DealTermRow } from '@/src/types/deal-workflow';

function mapCopy(text: string | undefined, table: Record<string, string>, ns: string, t: TFunction): string | undefined {
  if (!text?.trim()) return text;
  const key = table[text.trim()];
  return key ? t(`${ns}.${key}`) : text;
}

const NEXT_MILESTONE: Record<string, string> = {
  'Collect prepay before production starts.': 'collectPrepayBeforeProduction',
  'Prepay escrowed. Open delivery to start production.': 'prepayEscrowedOpenDelivery',
  'Continue delivery against the packet.': 'continueDeliveryAgainstPacket',
  'Submit verification proof to release remaining escrow.': 'submitVerificationProof',
  'Deal closed. Archive the packet for your records.': 'dealClosedArchivePacket',
  'Review remediation options with the brand.': 'reviewRemediationOptions',
  'Mediation in progress — hold further delivery changes.': 'mediationInProgress',
  'Accept to lock $4.8k prepay.': 'acceptToLockPrepay',
  'Review packet and confirm deliverables.': 'reviewPacketConfirmDeliverables',
  'Submit rough cut by May 22, 12:00. Review window: 48h.': 'submitRoughCutByDeadline',
  'Add first-day metrics before final verification.': 'addFirstDayMetrics',
  'Draft submitted; waiting on PR manager approval.': 'draftSubmittedWaitingPr',
  'Prepay locked. Start script draft this week.': 'prepayLockedStartScript',
  'Confirm packet and collect 50% prepay before shoot.': 'confirmPacketCollectPrepay',
  'Brand reviewing script v2 — respond by Thursday.': 'brandReviewingScriptV2',
  'Upload first-day views + pinned #ad screenshot.': 'uploadFirstDayViews',
  'Mediation: clarify Spark Ads usage vs paid add-on.': 'mediationSparkAds',
  'Review fixes: replacement, extension, or refund path.': 'reviewFixesPath',
  'Deal closed. Archive packet for tax records.': 'dealClosedTaxRecords',
  'Closed · optional performance recap available.': 'closedOptionalRecap',
  'Script uploaded. Submit rough cut when brand approves.': 'scriptUploadedSubmitRough',
  'Brand is reviewing your rough cut.': 'brandReviewingRoughCut',
  'Verification submitted. Brand review unlocks balance release.': 'verificationSubmittedBrandReview',
  'Brand is reviewing verification proof before balance release.': 'brandReviewingVerificationProof',
};

const OUTCOME_SUMMARY: Record<string, string> = {
  'Terms were confirmed from the structured brief.': 'termsConfirmedFromBrief',
  'Deal settled. Packet archived for records.': 'dealSettledArchived',
  'High match with your skincare content. Prepay ready to escrow.': 'recommendedSkincareMatch',
  'Your outdoor audience fits their target demo.': 'recommendedOutdoorAudience',
  'Deliver and publish against packet, then move to verification.': 'deliverThenVerify',
  'Post link submitted. Screenshots and metrics still needed.': 'postLinkNeedsMetrics',
  'Must mention watermelon extract in first 5 seconds. No competing skincare on screen.': 'glowRecipeCreativeBrief',
  'High-value lead above your rate floor. 50% prepay is in escrow.': 'ceraveHighValueEscrowed',
  'Terms confirmed from inbox brief. Waiting on brand finance to fund escrow.': 'bloomAwaitingFinance',
  'Production started. Keep usage limited to organic campaign per packet.': 'fitformProductionStarted',
  'Final cut approved. Verification checklist is partially complete.': 'petitePartialVerification',
  'Brand requested 30-day Spark Ads without separate fee. Dispute open.': 'maisonSparkAdsDispute',
  'Remediation in progress. Keep evidence and timeline clean.': 'gammaRemediationInProgress',
  'All deliverables verified and final payout released.': 'nordstromAllVerified',
  'Gift-turned-paid deal completed on time with full escrow release.': 'harborGiftDealComplete',
  'Packet terms will appear here when connected to API.': 'packetTermsPlaceholder',
};

const RECOMMEND_REASON: Record<string, string> = {
  'Skincare niche match': 'skincareNicheMatch',
  'Budget above recent median': 'budgetAboveMedian',
  'Deliverables match your short-form workflow': 'deliverablesShortForm',
  'Outdoor lifestyle audience match': 'outdoorAudienceMatch',
  'Brand accepts escrow-first delivery': 'escrowFirstDelivery',
  'Themes reusable in Media Kit': 'themesReusableMediaKit',
};

const RECOMMEND_PAYOUT_NOTE: Record<string, string> = {
  '100% prepay can be escrowed before production.': 'fullPrepayBeforeProduction',
  'Prepay required before delivery dates are committed.': 'prepayBeforeDates',
};

const RECOMMEND_RISK_NOTE: Record<string, string> = {
  'Claims review required. Keep usage limited to campaign scope unless priced separately.':
    'claimsReviewRequired',
  'Confirm location, usage term, and whether brand needs paid social edits.': 'confirmLocationUsage',
};

const PACKET_TERM_LABEL: Record<string, string> = {
  Deliverables: 'dealPacketScreen.termDeliverables',
  'Publish window': 'dealPacketScreen.termPublishWindow',
  'Posting window': 'dealPacketScreen.termPublishWindow',
  Disclosure: 'dealPacketScreen.termDisclosure',
  'Usage rights': 'dealPacketScreen.termUsageRights',
  Budget: 'dealPacketScreen.termBudget',
  Payment: 'dealPacketScreen.termPayment',
  Acceptance: 'dealPacketScreen.termAcceptance',
};

const PAYOUT_HINT: Record<string, string> = {
  'Remaining balance releases after verification and brand sign-off.': 'remainingAfterVerification',
  'Release after verification passes.': 'releaseAfterVerificationPasses',
  'Final 40% releases after metrics review.': 'finalFortyAfterMetrics',
  'Escrow hold until usage dispute resolves.': 'escrowHoldUntilDispute',
};

const PAYOUT_HINT_BUDGET = /^Remaining balance releases after verification\. Budget signal: (.+)\.$/;

export function localizeNextMilestone(text: string | undefined, t: TFunction): string | undefined {
  return mapCopy(text, NEXT_MILESTONE, 'dealCopy.nextMilestone', t);
}

export function localizeOutcomeSummary(text: string | undefined, t: TFunction): string | undefined {
  return mapCopy(text, OUTCOME_SUMMARY, 'dealCopy.outcomeSummary', t);
}

export function localizeRecommendReason(text: string, t: TFunction): string {
  return mapCopy(text, RECOMMEND_REASON, 'dealCopy.recommendReason', t) ?? text;
}

export function localizeRecommendPayoutNote(text: string | undefined, t: TFunction): string | undefined {
  if (!text?.trim()) return text;
  return mapCopy(text, RECOMMEND_PAYOUT_NOTE, 'dealCopy.recommendPayoutNote', t) ?? text;
}

export function localizeRecommendRiskNote(text: string | undefined, t: TFunction): string | undefined {
  if (!text?.trim()) return text;
  return mapCopy(text, RECOMMEND_RISK_NOTE, 'dealCopy.recommendRiskNote', t) ?? text;
}

export function localizePacketTermLabel(label: string, t: TFunction): string {
  const key = PACKET_TERM_LABEL[label.trim()];
  return key ? t(key) : label;
}

export function localizePacketTermRow(row: DealTermRow, t: TFunction): DealTermRow {
  return {
    label: localizePacketTermLabel(row.label, t),
    value: localizePacketTermValue(row.label, row.value, t),
  };
}

export function localizePacketTermRows(rows: DealTermRow[], t: TFunction): DealTermRow[] {
  return rows.map((row) => localizePacketTermRow(row, t));
}

const STANDARD_TERM_VALUES: Record<string, Record<string, string>> = {
  Disclosure: {
    '#ad in caption + pinned comment': 'dealCopy.termValue.standardDisclosure',
  },
};

function localizePacketTermValue(label: string, value: string, t: TFunction): string {
  const byLabel = STANDARD_TERM_VALUES[label.trim()];
  const key = byLabel?.[value.trim()];
  return key ? t(key) : value;
}

export function localizePayoutHint(text: string | undefined, t: TFunction): string | undefined {
  if (!text?.trim()) return text;
  const trimmed = text.trim();
  const key = PAYOUT_HINT[trimmed];
  if (key) return t(`dealCopy.payoutHint.${key}`);
  const budgetMatch = trimmed.match(PAYOUT_HINT_BUDGET);
  if (budgetMatch) {
    return t('dealCopy.payoutHint.remainingWithBudget', { budget: budgetMatch[1] });
  }
  return text;
}

export function localizeOpenDisputeTitle(dealTitle: string, t: TFunction): string {
  return t('dealDetailScreen.openDisputeTitle', { title: dealTitle });
}

/** Phase fallback when milestone text is unknown but phase is known (live API). */
export function milestoneFallbackForPhase(phase: EscrowLifecyclePhase, t: TFunction): string {
  return t(`dealCopy.milestoneByPhase.${phase}`);
}

export function resolveNextMilestone(
  text: string | undefined,
  phase: EscrowLifecyclePhase,
  t: TFunction,
): string | undefined {
  if (!text?.trim()) return undefined;
  const mapped = localizeNextMilestone(text, t);
  if (mapped !== text) return mapped;
  return milestoneFallbackForPhase(phase, t);
}

export function localizeDealSummaryCopy(deal: DealSummary, t: TFunction) {
  return {
    nextMilestone: resolveNextMilestone(deal.nextMilestone, deal.escrowPhase, t),
    outcomeSummary: deal.outcomeSummary ? localizeOutcomeSummary(deal.outcomeSummary, t) : undefined,
    recommendReasons: deal.recommendReasons?.map((reason) => localizeRecommendReason(reason, t)),
    recommendPayoutNote: localizeRecommendPayoutNote(deal.recommendPayoutNote, t),
    recommendRiskNote: localizeRecommendRiskNote(deal.recommendRiskNote, t),
  };
}
