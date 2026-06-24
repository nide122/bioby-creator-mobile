import { REPLY_DRAFT_PURPOSE_ORDER, isReplyDraftPurpose, replyDraftPurposeI18nKey } from '@/src/lib/reply-draft-purpose';

describe('reply-draft-purpose', () => {
  it('includes all five purposes in display order', () => {
    expect(REPLY_DRAFT_PURPOSE_ORDER).toEqual([
      'pre_outreach',
      'quote_follow_up',
      'clarify_scope',
      'counter_offer',
      'ack_and_schedule',
    ]);
  });

  it('validates purpose strings', () => {
    expect(isReplyDraftPurpose('quote_follow_up')).toBe(true);
    expect(isReplyDraftPurpose('unknown')).toBe(false);
  });

  it('builds i18n keys', () => {
    expect(replyDraftPurposeI18nKey('clarify_scope')).toBe('replyDraftGenerator.purpose.clarify_scope');
  });
});
