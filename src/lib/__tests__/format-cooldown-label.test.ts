import { ApiError } from '@/src/api/api-client';
import {
  formatCooldownLabel,
  parseProfileSummaryRateLimitCooldown,
} from '@/src/lib/format-cooldown-label';

const t = (key: string, options?: Record<string, unknown>) => {
  if (key.endsWith('Seconds')) return `Try again in ${options?.seconds}s`;
  if (key.endsWith('Minutes')) return `Try again in ${options?.minutes}m ${options?.seconds}s`;
  if (key.endsWith('Hours')) return `Try again in ${options?.hours}h ${options?.minutes}m`;
  return key;
};

describe('parseProfileSummaryRateLimitCooldown', () => {
  it('returns retryAfterSeconds for profile summary rate limits', () => {
    const error = new ApiError(429, 'PROFILE_SUMMARY_RATE_LIMITED', 'Too many requests', 45);
    expect(parseProfileSummaryRateLimitCooldown(error)).toBe(45);
  });

  it('returns null for other API errors', () => {
    expect(parseProfileSummaryRateLimitCooldown(new ApiError(500, 'OTHER', 'fail'))).toBeNull();
  });
});

describe('formatCooldownLabel', () => {
  it('formats sub-minute cooldowns', () => {
    expect(formatCooldownLabel(45, t, 'creatorProfileEditor.aiGenerateCooldown')).toBe('Try again in 45s');
  });

  it('formats minute-level cooldowns', () => {
    expect(formatCooldownLabel(125, t, 'creatorProfileEditor.aiGenerateCooldown')).toBe('Try again in 2m 5s');
  });

  it('formats hour-level cooldowns', () => {
    expect(formatCooldownLabel(3665, t, 'creatorProfileEditor.aiGenerateCooldown')).toBe('Try again in 1h 1m');
  });
});
