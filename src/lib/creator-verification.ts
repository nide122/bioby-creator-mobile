export type CreatorVerificationStatus = 'unverified' | 'verified';

export function isCreatorAiInboxEnabled(status: CreatorVerificationStatus | null | undefined): boolean {
  return status === 'verified';
}

/** Show dev-only verification shortcuts in local builds with a live API. */
export function isCreatorVerificationDevToolsEnabled(): boolean {
  return __DEV__;
}

export function normalizeCreatorVerificationStatus(
  raw: string | null | undefined,
): CreatorVerificationStatus {
  switch ((raw ?? 'unverified').toLowerCase()) {
    case 'verified':
      return 'verified';
    default:
      return 'unverified';
  }
}
