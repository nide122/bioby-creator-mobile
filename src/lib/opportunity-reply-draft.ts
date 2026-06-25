/** Resolve the single pending reply-email draft id for an opportunity. */
export function resolveOpportunityReplyDraftId(suggested: {
  aiReply: string;
  quote: string;
}): string {
  const aiReply = suggested.aiReply?.trim() ?? '';
  const quote = suggested.quote?.trim() ?? '';
  if (aiReply) return aiReply;
  return quote;
}

export function isResolvableReplyDraftId(draftId: string | undefined, apiMode: boolean): boolean {
  if (!draftId) return false;
  return !apiMode || /^\d+$/.test(draftId);
}
