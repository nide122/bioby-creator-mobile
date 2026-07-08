import { ApiError } from '@/src/api/api-client';
import { resolveBriefConfirmErrorMessage } from '@/src/lib/brief-confirm-error';

describe('resolveBriefConfirmErrorMessage', () => {
  const t = (key: string) => key;

  it('maps BRIEF_NOT_COMPLETE to i18n key', () => {
    expect(
      resolveBriefConfirmErrorMessage(
        new ApiError(409, 'BRIEF_NOT_COMPLETE', 'Brief must be complete'),
        t,
      ),
    ).toBe('inboxThreadDetail.confirmBriefErrors.BRIEF_NOT_COMPLETE');
  });

  it('maps LEAD_STAGE_TOO_EARLY to i18n key', () => {
    expect(
      resolveBriefConfirmErrorMessage(
        new ApiError(409, 'LEAD_STAGE_TOO_EARLY', 'Lead stage too early'),
        t,
      ),
    ).toBe('inboxThreadDetail.confirmBriefErrors.LEAD_STAGE_TOO_EARLY');
  });

  it('falls back to generic body for unknown errors', () => {
    expect(resolveBriefConfirmErrorMessage({}, t)).toBe('inboxThreadDetail.confirmBriefErrorBody');
  });
});
