export const REPLY_DRAFT_PURPOSES = [
  'pre_outreach',
  'clarify_brief',
  'quote_follow_up',
  'counter_offer',
  'ack_and_schedule',
  'confirm_terms',
  'request_extension',
  'request_product',
  'share_for_review',
  'request_changes',
  'follow_up_no_reply',
  'polite_decline',
] as const;

export type ReplyDraftPurpose = (typeof REPLY_DRAFT_PURPOSES)[number];

const LEGACY_REPLY_DRAFT_PURPOSE_ALIASES: Record<string, ReplyDraftPurpose> = {
  clarify_scope: 'clarify_brief',
  clarify_usage_rights: 'clarify_brief',
  confirm_deliverables: 'confirm_terms',
  confirm_payment_terms: 'confirm_terms',
  request_written_approval: 'confirm_terms',
};

export function isReplyDraftPurpose(value: string): value is ReplyDraftPurpose {
  return (REPLY_DRAFT_PURPOSES as readonly string[]).includes(value);
}

export function normalizeReplyDraftPurpose(value: string): ReplyDraftPurpose | null {
  if (isReplyDraftPurpose(value)) {
    return value;
  }
  return LEGACY_REPLY_DRAFT_PURPOSE_ALIASES[value] ?? null;
}

export function replyDraftPurposeI18nKey(purpose: ReplyDraftPurpose): string {
  return `replyDraftGenerator.scenario.${purpose}`;
}

export function replyDraftPurposeDisplayKey(wire: string): string {
  const normalized = normalizeReplyDraftPurpose(wire);
  if (normalized) {
    return replyDraftPurposeI18nKey(normalized);
  }
  return `replyDraftGenerator.scenario.${wire}`;
}

/** Most-used reply scenarios shown by default in the AI draft generator. */
export const REPLY_DRAFT_CORE_PURPOSES: ReplyDraftPurpose[] = [
  'pre_outreach',
  'clarify_brief',
  'quote_follow_up',
  'counter_offer',
  'ack_and_schedule',
];

/** All reply scenarios in display order. */
export const REPLY_DRAFT_PURPOSE_ORDER: ReplyDraftPurpose[] = [
  ...REPLY_DRAFT_CORE_PURPOSES,
  'confirm_terms',
  'request_extension',
  'request_product',
  'share_for_review',
  'request_changes',
  'follow_up_no_reply',
  'polite_decline',
];

export const REPLY_DRAFT_MORE_PURPOSES: ReplyDraftPurpose[] = REPLY_DRAFT_PURPOSE_ORDER.filter(
  (purpose) => !REPLY_DRAFT_CORE_PURPOSES.includes(purpose),
);

export function isReplyDraftCorePurpose(purpose: ReplyDraftPurpose): boolean {
  return REPLY_DRAFT_CORE_PURPOSES.includes(purpose);
}
