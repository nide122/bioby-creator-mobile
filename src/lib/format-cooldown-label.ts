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
  if (
    typeof error === 'object' &&
    error != null &&
    'code' in error &&
    (error as { code?: string }).code === 'PROFILE_SUMMARY_RATE_LIMITED'
  ) {
    const retryAfter = (error as { retryAfterSeconds?: number }).retryAfterSeconds;
    return retryAfter != null && retryAfter > 0 ? retryAfter : null;
  }
  return null;
}
