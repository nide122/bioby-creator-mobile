import type { TFunction } from 'i18next';

import {
  decisionCardBrandLabel,
  formatDecisionCardTitle,
  parseDecisionSourceHint,
  resolveDecisionCardDisplay,
  type DecisionCardDisplay,
} from '@/src/lib/decision-card-content';
import type { DecisionAction, DecisionCard } from '@/src/types/domain';

function mapCopy(text: string | undefined, table: Record<string, string>, ns: string, t: TFunction): string | undefined {
  if (!text?.trim()) return text;
  const key = table[text.trim()];
  return key ? t(`${ns}.${key}`) : text;
}

const AI_NOTE_EXACT: Record<string, string> = {
  'This pitch has time-sensitive terms or risks worth reviewing today.': 'timeSensitivePitch',
  'Worth a reply — budget or scope may still need clarification.': 'worthReplyClarify',
  'Review this brand pitch when you have a moment.': 'reviewWhenReady',
  'This draft requires your approval before it can be sent.': 'draftNeedsApproval',
  'Quote drafts require your approval before send.': 'quoteDraftNeedsApproval',
  'This deal is waiting on publish proof or delivery evidence before payout can move.': 'dealWaitingProof',
  'Creator proof is in. Confirm brand sign-off to release escrow.': 'brandReviewProof',
  'Upload publish proof to release escrow.': 'uploadProofReleaseEscrow',
  'High-value brief with claims review window — worth confirming rights before quote.': 'highValueClaimsReview',
  'Broad usage and prepay still unclear — negotiate before committing dates.': 'broadUsagePrepayUnclear',
  'Escrow is funded — track deliverables and publish timing in the deal packet.': 'escrowFundedTrackDelivery',
};

const URGENCY_EXACT: Record<string, string> = {
  'Needs attention today': 'needsAttentionToday',
  'Payout may be blocked': 'payoutMayBeBlocked',
  'Balance release blocked': 'balanceReleaseBlocked',
  'Payout blocked until proof': 'payoutBlockedUntilProof',
};

const ACTION_REASON_EXACT: Record<string, string> = {
  'Potentially risky usage or exclusivity language detected': 'dangerTerms',
  'Broad usage or remix terms detected': 'broadUsage',
  'Deadline within the next few days': 'deadline48h',
  'Claims or review window mentioned': 'claimsReview',
  'Budget mentioned in thread': 'budgetSignal',
  'Offer is well above your rate-card floor': 'exceptionalBudget',
  'No rate-card floor configured — using absolute budget threshold': 'noRateCardFloor',
  'No budget signal yet — clarify before quoting': 'missingBudget',
  'Offer below your TikTok floor': 'belowTikTokFloor',
  'Long-term use + remix edits': 'longTermRemixEdits',
  'Claims need pre-review before quote.': 'claimsPreReview',
  'Confirm budget before quoting.': 'confirmBudgetBeforeQuote',
};

const ACTION_LABEL_EXACT: Record<string, string> = {
  'Open thread': 'openThread',
  'Snooze': 'snooze',
  'Later': 'later',
  'Review draft': 'reviewDraft',
  'Review': 'review',
  'Submit proof': 'submitProof',
  'Upload proof': 'uploadProof',
  'Approve & release': 'approveRelease',
};

const HEADLINE_EXACT: Record<string, string> = {
  'Review quote draft': 'reviewQuoteDraft',
  'Review follow-up draft': 'reviewFollowUpDraft',
  'Review reply draft': 'reviewReplyDraft',
};

const SOURCE_PREFIX: Record<string, string> = {
  Inbox: 'inbox',
  Deal: 'deal',
  Draft: 'draft',
};

const BELOW_FLOOR_RATE = /^Offer below your rate-card floor \((.+)\)$/;
const ABOVE_FLOOR_RATE = /^Offer meets or exceeds your rate-card floor \((.+)\)$/;
const NEAR_FLOOR_RATE = /^Offer near your rate-card floor \((.+)\) — room to negotiate$/;
const RELEASE_AMOUNT = /^Release (.+)$/;
const DECIDE_ON_PITCH = /^Decide on (.+) pitch$/;
const FOLLOW_UP_WITH = /^Follow up with (.+)$/;
const FOLLOW_UP_ON_DELIVERY = /^Follow up on (.+) delivery$/;
const SUBMIT_VERIFICATION = /^Submit verification for (.+)$/;
const APPROVE_VERIFICATION = /^Approve verification for (.+)$/;

export function localizeDecisionAiNote(text: string | undefined, t: TFunction): string | undefined {
  const mapped = mapCopy(text, AI_NOTE_EXACT, 'decisionCard.aiNote', t);
  if (mapped !== text) return mapped;
  return localizeDecisionActionReasonMessage(text, t);
}

export function localizeDecisionUrgency(text: string | undefined, t: TFunction): string | undefined {
  const mapped = mapCopy(text, URGENCY_EXACT, 'decisionCard.urgency', t);
  if (mapped !== text) return mapped;
  return localizeDecisionActionReasonMessage(text, t);
}

export function localizeDecisionActionReasonMessage(text: string | undefined, t: TFunction): string | undefined {
  if (!text?.trim()) return text;
  const trimmed = text.trim();
  const exact = mapCopy(trimmed, ACTION_REASON_EXACT, 'decisionCard.actionReason', t);
  if (exact !== trimmed) return exact;

  const belowFloor = trimmed.match(BELOW_FLOOR_RATE);
  if (belowFloor) return t('decisionCard.actionReason.belowFloorRate', { floor: belowFloor[1] });

  const aboveFloor = trimmed.match(ABOVE_FLOOR_RATE);
  if (aboveFloor) return t('decisionCard.actionReason.aboveFloorRate', { floor: aboveFloor[1] });

  const nearFloor = trimmed.match(NEAR_FLOOR_RATE);
  if (nearFloor) return t('decisionCard.actionReason.nearFloorRate', { floor: nearFloor[1] });

  return text;
}

export function localizeDecisionHeadline(headline: string, card: DecisionCard, t: TFunction): string {
  const trimmed = headline.trim();
  const exact = mapCopy(trimmed, HEADLINE_EXACT, 'decisionCard.headline', t);
  if (exact !== trimmed) return exact!;

  const releaseAmount = trimmed.match(RELEASE_AMOUNT);
  if (releaseAmount) return t('decisionCard.headline.releaseAmount', { amount: releaseAmount[1] });

  const decidePitch = trimmed.match(DECIDE_ON_PITCH);
  if (decidePitch) return t('decisionCard.headline.decideOnPitch', { brand: decidePitch[1] });

  const followUpWith = trimmed.match(FOLLOW_UP_WITH);
  if (followUpWith) return t('decisionCard.headline.followUpWith', { brand: followUpWith[1] });

  const followUpDelivery = trimmed.match(FOLLOW_UP_ON_DELIVERY);
  if (followUpDelivery) return t('decisionCard.headline.followUpOnDelivery', { brand: followUpDelivery[1] });

  const submitVerification = trimmed.match(SUBMIT_VERIFICATION);
  if (submitVerification) return t('decisionCard.headline.submitVerification', { title: submitVerification[1] });

  const approveVerification = trimmed.match(APPROVE_VERIFICATION);
  if (approveVerification) return t('decisionCard.headline.approveVerification', { title: approveVerification[1] });

  return headline;
}

export function localizeDecisionSourceHint(sourceHint: string | undefined, t: TFunction): string | undefined {
  if (!sourceHint?.trim()) return sourceHint;
  const { prefix, detail } = parseDecisionSourceHint(sourceHint);
  if (!prefix) return sourceHint;

  const prefixKey = SOURCE_PREFIX[prefix];
  const localizedPrefix = prefixKey ? t(`decisionCard.sourcePrefix.${prefixKey}`) : prefix;
  return detail ? `${localizedPrefix} · ${detail}` : localizedPrefix;
}

export function localizeDecisionActionLabel(
  action: DecisionAction,
  t: TFunction,
  card?: DecisionCard,
): string {
  if (
    (card?.category === 'opportunity' && action.id === 'open') ||
    action.id === 'upload' ||
    action.label?.trim() === 'Upload proof' ||
    action.label?.trim() === 'Submit proof'
  ) {
    return t('decisionCard.actions.open');
  }
  const mapped = mapCopy(action.label, ACTION_LABEL_EXACT, 'decisionCard.actions', t);
  return mapped ?? action.label;
}

export function localizeDecisionCard(card: DecisionCard, t: TFunction): DecisionCard {
  return {
    ...card,
    headline: localizeDecisionHeadline(card.headline, card, t),
    aiNote: localizeDecisionAiNote(card.aiNote, t) ?? card.aiNote,
    urgencyNote: card.urgencyNote ? localizeDecisionUrgency(card.urgencyNote, t) : undefined,
    interruptReason: card.interruptReason ? localizeDecisionActionReasonMessage(card.interruptReason, t) : undefined,
    sourceHint: localizeDecisionSourceHint(card.sourceHint, t),
    actions: card.actions.map((action) => ({
      ...action,
      label: localizeDecisionActionLabel(action, t, card),
    })),
  };
}

export type LocalizedDecisionPresentation = {
  display: DecisionCardDisplay;
  aiNote: string;
  sourceHint?: string;
  actions: DecisionAction[];
};

export function getLocalizedDecisionPresentation(card: DecisionCard, t: TFunction): LocalizedDecisionPresentation {
  const display = resolveDecisionCardDisplay(card);
  const actions = card.actions.map((action) => ({
    ...action,
    label: localizeDecisionActionLabel(action, t, card),
  }));
  const primaryAction = display.primaryAction
    ? (actions.find((action) => action.id === display.primaryAction!.id) ?? {
        ...display.primaryAction,
        label: localizeDecisionActionLabel(display.primaryAction, t, card),
      })
    : undefined;

  return {
    display: {
      ...display,
      actionSummary: display.actionSummary ? localizeDecisionHeadline(display.actionSummary, card, t) : undefined,
      primaryAction,
      urgencyLabel: display.urgencyLabel ? localizeDecisionUrgency(display.urgencyLabel, t) : undefined,
    },
    aiNote: localizeDecisionAiNote(card.aiNote, t) ?? card.aiNote,
    sourceHint: localizeDecisionSourceHint(card.sourceHint, t),
    actions,
  };
}

export function formatLocalizedDecisionQueuePreviewLines(
  card: DecisionCard,
  t: TFunction
): { title: string; subtitle: string } {
  const presentation = getLocalizedDecisionPresentation(card, t);
  const brand = decisionCardBrandLabel(card) ?? presentation.display.brand;
  const title = formatDecisionCardTitle(brand, presentation.display.subject);
  const subtitle =
    presentation.aiNote?.trim() ||
    presentation.display.urgencyLabel ||
    localizeDecisionActionReasonMessage(card.interruptReason, t) ||
    '';
  return {
    title,
    subtitle,
  };
}
