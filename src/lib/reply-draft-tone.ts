export const REPLY_DRAFT_TONES = ['friendly', 'professional', 'firm'] as const;

export type ReplyDraftTone = (typeof REPLY_DRAFT_TONES)[number];

export function replyDraftToneI18nKey(tone: ReplyDraftTone): string {
  return `replyDraftGenerator.tone.${tone}`;
}
