import { migrateLegacyProfileBasics } from '@/src/lib/creator-profile-aggregate';
import { isCreatorAiInboxEnabled } from '@/src/lib/creator-verification';
import type { CreatorProfileBasics } from '@/src/stores/session-store';

export type CreatorVerificationPreflightKind =
  | 'verified'
  | 'profile_incomplete'
  | 'mailbox_required'
  | 'homepage_email_missing'
  | 'email_mismatch'
  | 'ready';

export type CreatorVerificationPreflight = {
  kind: CreatorVerificationPreflightKind;
  boundMailboxEmail?: string | null;
  homepageEmail?: string | null;
};

export function isCreatorProfileLinkedForVerification(
  profile: CreatorProfileBasics | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.profileUrl?.trim()) return true;

  const { platformProfiles } = migrateLegacyProfileBasics(profile);
  if (!platformProfiles) return false;

  return Object.values(platformProfiles).some(
    (slot) =>
      slot?.status &&
      slot.status !== 'empty' &&
      Boolean(slot.profileUrl?.trim()),
  );
}

export function creatorEmailsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = left?.trim().toLowerCase();
  const b = right?.trim().toLowerCase();
  return Boolean(a && b && a === b);
}

export function resolveCreatorVerificationPreflight(input: {
  profile?: CreatorProfileBasics | null;
  mailboxConnected?: boolean;
  creatorVerificationStatus?: string | null;
  homepageEmail?: string | null;
  boundMailboxEmail?: string | null;
}): CreatorVerificationPreflight {
  if (isCreatorAiInboxEnabled(input.creatorVerificationStatus)) {
    return { kind: 'verified' };
  }

  if (!input.mailboxConnected) {
    return { kind: 'mailbox_required' };
  }

  if (!isCreatorProfileLinkedForVerification(input.profile)) {
    return { kind: 'profile_incomplete' };
  }

  const boundMailboxEmail = input.boundMailboxEmail?.trim() || null;
  const homepageEmail = input.homepageEmail?.trim() || null;

  if (!homepageEmail) {
    return { kind: 'homepage_email_missing', boundMailboxEmail };
  }

  if (!creatorEmailsMatch(boundMailboxEmail, homepageEmail)) {
    return { kind: 'email_mismatch', boundMailboxEmail, homepageEmail };
  }

  return { kind: 'ready', boundMailboxEmail, homepageEmail };
}
