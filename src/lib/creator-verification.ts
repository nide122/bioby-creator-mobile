export type CreatorVerificationStatus = 'unverified' | 'verified';

export function isCreatorAiInboxEnabled(status: CreatorVerificationStatus | null | undefined): boolean {
  return status === 'verified';
}

/** Show dev-only verification shortcuts in local builds or when EXPO_PUBLIC_CREATOR_VERIFICATION_DEV_TOOLS=true. */
export function isCreatorVerificationDevToolsEnabled(): boolean {
  if (__DEV__) return true;
  const raw = process.env.EXPO_PUBLIC_CREATOR_VERIFICATION_DEV_TOOLS?.trim().toLowerCase();
  return raw === 'true' || raw === '1';
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
