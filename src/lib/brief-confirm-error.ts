import { ApiError } from '@/src/api/api-client';

const BRIEF_CONFIRM_ERROR_KEYS: Record<string, string> = {
  BRIEF_NOT_COMPLETE: 'inboxThreadDetail.confirmBriefErrors.BRIEF_NOT_COMPLETE',
  LEAD_STAGE_TOO_EARLY: 'inboxThreadDetail.confirmBriefErrors.LEAD_STAGE_TOO_EARLY',
  NOT_FOUND: 'inboxThreadDetail.confirmBriefErrors.NOT_FOUND',
};

export function resolveBriefConfirmErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof ApiError) {
    const key = BRIEF_CONFIRM_ERROR_KEYS[error.code];
    if (key) {
      return t(key);
    }
    if (error.message.trim()) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return t('inboxThreadDetail.confirmBriefErrorBody');
}
