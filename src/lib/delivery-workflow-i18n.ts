import type { TFunction } from 'i18next';

import type { DealDeliveryStep, DealUploadRow } from '@/src/types/deal-workflow';

type TimelineStepDef = {
  titleKey: string;
  dueKey: string;
  noteKey: string;
  ownerKey: 'stepOwnerYou' | 'stepOwnerCreator' | 'stepOwnerBrand';
};

const TIMELINE_STEP_DEFS: Record<string, TimelineStepDef> = {
  brief: {
    titleKey: 'stepBriefTitle',
    dueKey: 'stepBriefDue',
    noteKey: 'stepBriefNote',
    ownerKey: 'stepOwnerYou',
  },
  kickoff: {
    titleKey: 'stepKickoffTitle',
    dueKey: 'stepKickoffDue',
    noteKey: 'stepKickoffNote',
    ownerKey: 'stepOwnerYou',
  },
  script: {
    titleKey: 'stepScriptTitle',
    dueKey: 'stepScriptDue',
    noteKey: 'stepScriptNote',
    ownerKey: 'stepOwnerCreator',
  },
  'rough-cut': {
    titleKey: 'stepRoughTitle',
    dueKey: 'stepRoughDue',
    noteKey: 'stepRoughNote',
    ownerKey: 'stepOwnerBrand',
  },
  final: {
    titleKey: 'stepFinalTitle',
    dueKey: 'stepFinalDue',
    noteKey: 'stepFinalNote',
    ownerKey: 'stepOwnerCreator',
  },
  live: {
    titleKey: 'stepLiveTitle',
    dueKey: 'stepLiveDue',
    noteKey: 'stepLiveNote',
    ownerKey: 'stepOwnerCreator',
  },
  issue: {
    titleKey: 'stepIssueTitle',
    dueKey: 'stepIssueDue',
    noteKey: 'stepIssueNote',
    ownerKey: 'stepOwnerBrand',
  },
  reshoot: {
    titleKey: 'stepReshootTitle',
    dueKey: 'stepReshootDue',
    noteKey: 'stepReshootNote',
    ownerKey: 'stepOwnerCreator',
  },
  release: {
    titleKey: 'stepReleaseTitle',
    dueKey: 'stepReleaseDue',
    noteKey: 'stepReleaseNote',
    ownerKey: 'stepOwnerYou',
  },
};

const UPLOAD_TITLE_KEYS: Record<string, string> = {
  script: 'fileScriptTitle',
  rough: 'fileRoughTitle',
  final: 'fileFinalTitle',
};

const FEEDBACK_NOTE_KEYS: Record<string, string> = {
  'Escrow activates after prepay. Upload script → rough → final from the Delivery workspace.':
    'feedbackNotePrepay',
  'Script uploaded. Brand review before rough cut.': 'feedbackNoteAfterScript',
  'Script uploaded. Submit rough cut when brand approves.': 'feedbackNoteAfterScriptAlt',
  'Rough cut uploaded. Brand has 48h to review.': 'feedbackNoteAfterRough',
  'Brand is reviewing your rough cut.': 'feedbackNoteAfterRoughReview',
  'Final export received. Open verification to submit publish proof.': 'feedbackNoteAfterFinal',
  'Submit verification proof to release remaining escrow.': 'feedbackNoteVerification',
  'Brand is reviewing rough cut v1.': 'feedbackNoteReviewingRoughV1',
  'PR manager reviewing draft — creative control on hook wording.': 'feedbackNotePrReviewingDraft',
  'Waiting on brand feedback for script v2.': 'feedbackNoteWaitingScriptV2',
  'Brand wants tighter product mention in first 8 seconds.': 'feedbackNoteTighterProductMention',
};

function deliveryKey(t: TFunction, key: string): string {
  return t(`dealDeliveryScreen.${key}`);
}

export function localizeDeliveryTimelineStep(step: DealDeliveryStep, t: TFunction): DealDeliveryStep {
  const def = TIMELINE_STEP_DEFS[step.id];
  if (!def) return step;
  return {
    ...step,
    title: deliveryKey(t, def.titleKey),
    due: deliveryKey(t, def.dueKey),
    note: deliveryKey(t, def.noteKey),
    owner: deliveryKey(t, def.ownerKey),
  };
}

export function localizeDeliveryTimeline(steps: DealDeliveryStep[], t: TFunction): DealDeliveryStep[] {
  return steps.map((step) => localizeDeliveryTimelineStep(step, t));
}

export function localizeDeliveryUploadRow(row: DealUploadRow, t: TFunction): DealUploadRow {
  const titleKey = UPLOAD_TITLE_KEYS[row.id];
  return {
    ...row,
    title: titleKey ? deliveryKey(t, titleKey) : row.title,
  };
}

export function localizeDeliveryUploads(rows: DealUploadRow[], t: TFunction): DealUploadRow[] {
  return rows.map((row) => localizeDeliveryUploadRow(row, t));
}

export function localizeDeliveryFeedbackNote(note: string | undefined, t: TFunction): string | undefined {
  if (!note?.trim()) return undefined;
  const key = FEEDBACK_NOTE_KEYS[note.trim()];
  return key ? deliveryKey(t, key) : note;
}

const UPLOAD_STATE_KEYS: Record<string, string> = {
  'Not started': 'fileNotStarted',
  Approved: 'uploadStateApproved',
  'In review': 'uploadStateInReview',
  'In brand review': 'uploadStateInReview',
  Delivered: 'uploadStateDelivered',
  Uploading: 'uploadStateUploading',
  Uploaded: 'uploadStateUploaded',
  'Uploaded · In brand review': 'uploadStateUploadedBrandReview',
  'Uploaded · Ready for verification': 'uploadStateUploadedReadyVerification',
};

export function localizeDeliveryUploadState(state: string, uploadId: string, t: TFunction): string {
  const trimmed = state.trim();
  const exact = UPLOAD_STATE_KEYS[trimmed];
  if (exact) return deliveryKey(t, exact);
  if (/uploaded/i.test(trimmed)) {
    if (/ready for verification/i.test(trimmed)) return deliveryKey(t, 'uploadStateUploadedReadyVerification');
    if (/brand review/i.test(trimmed)) return deliveryKey(t, 'uploadStateUploadedBrandReview');
    return deliveryKey(t, 'uploadStateUploaded');
  }
  if (/not started/i.test(trimmed)) return deliveryKey(t, 'fileNotStarted');
  if (/approved/i.test(trimmed)) return deliveryKey(t, 'uploadStateApproved');
  if (/in review/i.test(trimmed)) return deliveryKey(t, 'uploadStateInReview');
  return state;
}
