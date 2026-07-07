import {
  REPLY_DRAFT_CORE_PURPOSES,
  REPLY_DRAFT_MORE_PURPOSES,
  REPLY_DRAFT_PURPOSE_ORDER,
  isReplyDraftCorePurpose,
  isReplyDraftPurpose,
  normalizeReplyDraftPurpose,
  replyDraftPurposeDisplayKey,
  replyDraftPurposeI18nKey,
} from '@/src/lib/reply-draft-purpose';

describe('reply-draft-purpose', () => {
  it('includes production scenarios in display order', () => {
    expect(REPLY_DRAFT_PURPOSE_ORDER).toContain('confirm_terms');
    expect(REPLY_DRAFT_PURPOSE_ORDER).toContain('request_product');
    expect(REPLY_DRAFT_PURPOSE_ORDER).toContain('share_for_review');
    expect(REPLY_DRAFT_PURPOSE_ORDER.length).toBe(12);
  });

  it('splits core and more scenarios', () => {
    expect(REPLY_DRAFT_CORE_PURPOSES.length).toBe(5);
    expect(REPLY_DRAFT_MORE_PURPOSES.length).toBe(7);
    expect(REPLY_DRAFT_CORE_PURPOSES.every((purpose) => isReplyDraftCorePurpose(purpose))).toBe(true);
    expect(REPLY_DRAFT_MORE_PURPOSES.every((purpose) => !isReplyDraftCorePurpose(purpose))).toBe(true);
  });

  it('validates purpose strings', () => {
    expect(isReplyDraftPurpose('quote_follow_up')).toBe(true);
    expect(isReplyDraftPurpose('request_product')).toBe(true);
    expect(isReplyDraftPurpose('clarify_scope')).toBe(false);
    expect(isReplyDraftPurpose('unknown')).toBe(false);
  });

  it('normalizes legacy purpose aliases', () => {
    expect(normalizeReplyDraftPurpose('clarify_scope')).toBe('clarify_brief');
    expect(normalizeReplyDraftPurpose('clarify_usage_rights')).toBe('clarify_brief');
    expect(normalizeReplyDraftPurpose('confirm_payment_terms')).toBe('confirm_terms');
    expect(normalizeReplyDraftPurpose('request_written_approval')).toBe('confirm_terms');
  });

  it('builds scenario i18n keys', () => {
    expect(replyDraftPurposeI18nKey('clarify_brief')).toBe('replyDraftGenerator.scenario.clarify_brief');
    expect(replyDraftPurposeDisplayKey('clarify_scope')).toBe('replyDraftGenerator.scenario.clarify_brief');
  });
});
