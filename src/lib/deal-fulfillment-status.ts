import type { TFunction } from 'i18next';

import type {
  DealFulfillmentStatusBlock,
  DealFulfillmentStatusView,
  DealPacketContent,
} from '@/src/types/deal-workflow';
import type { DealSummary, EscrowLifecyclePhase } from '@/src/types/domain';
import { isUploadRegistered } from '@/src/lib/delivery-upload-steps';

type JsonObject = Record<string, unknown>;

function parseBlock(raw: unknown): DealFulfillmentStatusBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const node = raw as JsonObject;
  const id = String(node.id ?? '');
  const phase = String(node.phase ?? 'waiting');
  const statusKey = String(node.statusKey ?? '');
  const nextStepKey = String(node.nextStepKey ?? '');
  if (!id || !statusKey || !nextStepKey) return null;
  const revisionCount =
    typeof node.revisionCount === 'number'
      ? node.revisionCount
      : node.revisionCount == null
        ? null
        : Number(node.revisionCount);
  return {
    id,
    phase:
      phase === 'done' || phase === 'active' || phase === 'waiting' || phase === 'blocked'
        ? phase
        : 'waiting',
    statusKey,
    nextStepKey,
    revisionCount: Number.isFinite(revisionCount ?? NaN) ? revisionCount : null,
  };
}

export function parseFulfillmentStatus(raw: unknown): DealFulfillmentStatusView | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const node = raw as JsonObject;
  const payment = parseBlock(node.payment);
  const revision = parseBlock(node.revision);
  const brandReview = parseBlock(node.brandReview);
  if (!payment || !revision || !brandReview) return undefined;
  return { payment, revision, brandReview };
}

function countUploads(delivery?: DealPacketContent['delivery']): number {
  if (!delivery?.uploads?.length) return 0;
  return delivery.uploads.filter((row) => isUploadRegistered(row.state)).length;
}

function uploadStateIncludes(delivery: DealPacketContent['delivery'] | undefined, id: string, fragment: string) {
  const row = delivery?.uploads?.find((item) => item.id === id);
  return row?.state?.toLowerCase().includes(fragment.toLowerCase()) ?? false;
}

/** Client fallback when API has not yet returned fulfillmentStatus. */
export function buildDealFulfillmentStatus(
  deal: DealSummary,
  packet?: DealPacketContent,
): DealFulfillmentStatusView {
  const delivery = packet?.delivery;
  const verification = packet?.verification;
  const uploadCount = countUploads(delivery);
  const escrow = deal.escrowPhase;

  const payment = paymentBlock(escrow, verification);
  const revision = revisionBlock(escrow, delivery, uploadCount);
  const brandReview = brandReviewBlock(escrow, delivery, verification);
  return { payment, revision, brandReview };
}

function paymentBlock(
  escrow: EscrowLifecyclePhase,
  verification?: DealPacketContent['verification'],
): DealFulfillmentStatusBlock {
  switch (escrow) {
    case 'settled':
      return block('payment', 'done', 'paymentPaidInFull', 'paymentNextArchive');
    case 'awaiting_prepay':
      return block('payment', 'active', 'paymentAwaitingPrepay', 'paymentNextCollectPrepay');
    case 'escrowed':
    case 'in_execution':
      return block('payment', 'done', 'paymentPrepayEscrowed', 'paymentNextDeliver');
    case 'pending_verification':
      if (verification?.brandReviewStatus === 'pending' || verification?.submittedAt) {
        return block('payment', 'waiting', 'paymentBalanceHeld', 'paymentNextAfterBrandReview');
      }
      return block('payment', 'waiting', 'paymentBalanceHeld', 'paymentNextSubmitProof');
    case 'disputed':
      return block('payment', 'blocked', 'paymentDisputed', 'paymentNextResolveDispute');
    case 'remediation':
      return block('payment', 'blocked', 'paymentRemediation', 'paymentNextReviseDelivery');
    default:
      return block('payment', 'waiting', 'paymentAwaitingPrepay', 'paymentNextCollectPrepay');
  }
}

function revisionBlock(
  escrow: EscrowLifecyclePhase,
  delivery: DealPacketContent['delivery'] | undefined,
  uploadCount: number,
): DealFulfillmentStatusBlock {
  if (escrow === 'settled') {
    return block('revision', 'done', 'revisionComplete', 'revisionNextArchive', uploadCount);
  }
  if (escrow === 'disputed' || escrow === 'remediation') {
    return block('revision', 'blocked', 'revisionPaused', 'revisionNextResolveDispute', uploadCount);
  }
  if (uploadStateIncludes(delivery, 'final', 'ready for verification')) {
    return block('revision', 'done', 'revisionFinalUploaded', 'revisionNextVerification', uploadCount);
  }
  if (uploadStateIncludes(delivery, 'rough', 'brand review')) {
    return block('revision', 'waiting', 'revisionBrandReviewingRough', 'revisionNextAwaitRoughFeedback', uploadCount);
  }
  if (uploadCount > 0) {
    return block('revision', 'active', 'revisionInProgress', 'revisionNextUploadRoughOrFinal', uploadCount);
  }
  if (escrow === 'awaiting_prepay') {
    return block('revision', 'waiting', 'revisionNotStarted', 'revisionNextAfterPrepay', 0);
  }
  return block('revision', 'active', 'revisionNotStarted', 'revisionNextUploadScript', 0);
}

function brandReviewBlock(
  escrow: EscrowLifecyclePhase,
  delivery: DealPacketContent['delivery'] | undefined,
  verification?: DealPacketContent['verification'],
): DealFulfillmentStatusBlock {
  if (escrow === 'settled' || verification?.brandReviewStatus === 'approved') {
    return block('brandReview', 'done', 'brandReviewApproved', 'brandReviewNextSettled');
  }
  if (verification?.brandReviewStatus === 'pending' || verification?.submittedAt) {
    return block('brandReview', 'active', 'brandReviewPending', 'brandReviewNextApprove');
  }
  if (escrow === 'pending_verification') {
    return block('brandReview', 'waiting', 'brandReviewNotSubmitted', 'brandReviewNextSubmitProof');
  }
  if (uploadStateIncludes(delivery, 'rough', 'brand review')) {
    return block('brandReview', 'waiting', 'brandReviewRoughCut', 'brandReviewNextAwaitRoughFeedback');
  }
  return block('brandReview', 'waiting', 'brandReviewNotStarted', 'brandReviewNextAfterDelivery');
}

function block(
  id: DealFulfillmentStatusBlock['id'],
  phase: DealFulfillmentStatusBlock['phase'],
  statusKey: string,
  nextStepKey: string,
  revisionCount?: number | null,
): DealFulfillmentStatusBlock {
  return { id, phase, statusKey, nextStepKey, revisionCount: revisionCount ?? null };
}

export function localizeFulfillmentStatusBlock(
  blockItem: DealFulfillmentStatusBlock,
  t: TFunction,
): { title: string; status: string; nextStep: string } {
  const title = t(`dealStatusStrip.blocks.${blockItem.id}.title`);
  let status = t(`dealStatusStrip.status.${blockItem.statusKey}`);
  if (blockItem.id === 'revision' && blockItem.revisionCount != null && blockItem.revisionCount > 0) {
    status = t('dealStatusStrip.revisionCountStatus', { count: blockItem.revisionCount, status });
  }
  const nextStep = t(`dealStatusStrip.next.${blockItem.nextStepKey}`);
  return { title, status, nextStep };
}

export function resolveFulfillmentStatus(
  deal: DealSummary,
  packet?: DealPacketContent,
  apiStatus?: DealFulfillmentStatusView,
): DealFulfillmentStatusView {
  return apiStatus ?? buildDealFulfillmentStatus(deal, packet);
}
