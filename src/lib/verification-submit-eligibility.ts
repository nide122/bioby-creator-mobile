export type VerificationFormInput = {
  postLink: string;
  screenshotAttested: boolean;
  firstDayMetrics: string;
  creatorNote: string;
};

export type VerificationEvidenceStatus = 'done' | 'reviewing' | 'missing';

export const USER_CONFIRM_CHECKLIST_IDS = ['format', 'published', 'compliance'] as const;

export type UserConfirmChecklistId = (typeof USER_CONFIRM_CHECKLIST_IDS)[number];

export type ChecklistConfirmations = Partial<Record<UserConfirmChecklistId, boolean>>;

const MIN_TEXT_LENGTH = 6;

const EVIDENCE_IDS = ['post-link', 'screenshot', 'metrics'] as const;

function statusRank(status: VerificationEvidenceStatus): number {
  switch (status) {
    case 'done':
      return 2;
    case 'reviewing':
      return 1;
    default:
      return 0;
  }
}

function pickHigherStatus(
  left: VerificationEvidenceStatus,
  right: VerificationEvidenceStatus,
): VerificationEvidenceStatus {
  return statusRank(left) >= statusRank(right) ? left : right;
}

export function isUserConfirmChecklistId(id: string): id is UserConfirmChecklistId {
  return (USER_CONFIRM_CHECKLIST_IDS as readonly string[]).includes(id);
}

export function submittedEvidenceDefaults(): Record<string, VerificationEvidenceStatus> {
  return {
    'post-link': 'done',
    screenshot: 'done',
    metrics: 'reviewing',
  };
}

export function isValidPostLink(value: string): boolean {
  const trimmed = value.trim();
  return /^https?:\/\S+/i.test(trimmed);
}

export function resolveVerificationChecklist(
  baseChecklist: { id: string; passed: boolean }[],
  confirmations: ChecklistConfirmations,
  postLinkValid: boolean,
): { id: string; passed: boolean; userConfirmable: boolean }[] {
  return baseChecklist.map((item) => {
    if (isUserConfirmChecklistId(item.id)) {
      return {
        id: item.id,
        passed: confirmations[item.id] === true,
        userConfirmable: true,
      };
    }
    if (item.id === 'access') {
      return { id: item.id, passed: postLinkValid || item.passed, userConfirmable: false };
    }
    return { id: item.id, passed: item.passed, userConfirmable: false };
  });
}

export function allUserChecksConfirmed(checklist: { id: string; passed: boolean }[]): boolean {
  return USER_CONFIRM_CHECKLIST_IDS.every(
    (id) => checklist.find((item) => item.id === id)?.passed === true,
  );
}

export function canSubmitVerification(
  input: VerificationFormInput,
  phaseAllowsSubmit: boolean,
  checklist: { id: string; passed: boolean }[],
): boolean {
  if (!phaseAllowsSubmit) return false;
  if (!allUserChecksConfirmed(checklist)) return false;
  return (
    isValidPostLink(input.postLink) &&
    input.screenshotAttested &&
    input.firstDayMetrics.trim().length >= MIN_TEXT_LENGTH &&
    input.creatorNote.trim().length >= MIN_TEXT_LENGTH
  );
}

export function evidenceStatusFromForm(
  input: VerificationFormInput,
  submitted: boolean,
): Record<string, VerificationEvidenceStatus> {
  if (submitted) {
    return {
      'post-link': 'done',
      screenshot: input.screenshotAttested ? 'done' : 'missing',
      metrics: input.firstDayMetrics.trim().length >= MIN_TEXT_LENGTH ? 'reviewing' : 'missing',
    };
  }
  return {
    'post-link': isValidPostLink(input.postLink) ? 'done' : 'missing',
    screenshot: input.screenshotAttested ? 'done' : 'missing',
    metrics:
      input.firstDayMetrics.trim().length >= MIN_TEXT_LENGTH
        ? 'reviewing'
        : 'missing',
  };
}

export function mergeEvidenceStatuses(
  apiEvidence: { id: string; status: VerificationEvidenceStatus }[],
  formStatuses: Record<string, VerificationEvidenceStatus>,
  submitted: boolean,
): { id: string; status: VerificationEvidenceStatus }[] {
  const submittedDefaults = submittedEvidenceDefaults();
  return EVIDENCE_IDS.map((id) => {
    const apiStatus = apiEvidence.find((item) => item.id === id)?.status ?? 'missing';
    const formStatus = formStatuses[id] ?? 'missing';
    if (!submitted) {
      return { id, status: formStatus };
    }
    const merged = pickHigherStatus(pickHigherStatus(apiStatus, formStatus), submittedDefaults[id] ?? 'missing');
    return { id, status: merged };
  });
}
