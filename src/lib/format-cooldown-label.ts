type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Human-readable countdown for a disabled action button. */
export function formatCooldownLabel(seconds: number, t: Translate, keyPrefix: string): string {
  const remaining = Math.max(1, Math.ceil(seconds));
  if (remaining >= 3600) {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return t(`${keyPrefix}Hours`, { hours, minutes });
  }
  if (remaining >= 60) {
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return t(`${keyPrefix}Minutes`, { minutes, seconds: secs });
  }
  return t(`${keyPrefix}Seconds`, { seconds: remaining });
}

export function parseProfileSummaryRateLimitCooldown(error: unknown): number | null {
  return parseRateLimitCooldown(error, 'PROFILE_SUMMARY_RATE_LIMITED');
}

export function parseReplyDraftRateLimitCooldown(error: unknown): number | null {
  return parseRateLimitCooldown(error, 'REPLY_DRAFT_RATE_LIMITED');
}

function parseRateLimitCooldown(error: unknown, code: string): number | null {
  if (typeof error === 'object' && error != null && 'code' in error && (error as { code?: string }).code === code) {
    const retryAfter = (error as { retryAfterSeconds?: number }).retryAfterSeconds;
    return retryAfter != null && retryAfter > 0 ? retryAfter : null;
  }
  return null;
}
