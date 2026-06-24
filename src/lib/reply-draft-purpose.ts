export const REPLY_DRAFT_PURPOSES = [
  'pre_outreach',
  'quote_follow_up',
  'clarify_scope',
  'counter_offer',
  'ack_and_schedule',
] as const;

export type ReplyDraftPurpose = (typeof REPLY_DRAFT_PURPOSES)[number];

export function isReplyDraftPurpose(value: string): value is ReplyDraftPurpose {
  return (REPLY_DRAFT_PURPOSES as readonly string[]).includes(value);
}

export function replyDraftPurposeI18nKey(purpose: ReplyDraftPurpose): string {
  return `replyDraftGenerator.purpose.${purpose}`;
}

/** P1 subset kept for reference; UI exposes all purposes in P3. */
export const REPLY_DRAFT_PURPOSE_ORDER: ReplyDraftPurpose[] = [
  'pre_outreach',
  'quote_follow_up',
  'clarify_scope',
  'counter_offer',
  'ack_and_schedule',
];
