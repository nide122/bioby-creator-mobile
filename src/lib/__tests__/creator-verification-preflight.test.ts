import {
  creatorEmailsMatch,
  isCreatorProfileLinkedForVerification,
  resolveCreatorVerificationPreflight,
} from '@/src/lib/creator-verification-preflight';

describe('creator-verification-preflight', () => {
  it('matches emails case-insensitively', () => {
    expect(creatorEmailsMatch('Creator@Example.com', 'creator@example.com')).toBe(true);
    expect(creatorEmailsMatch('creator@example.com', 'other@example.com')).toBe(false);
  });

  it('requires a linked platform homepage for verification profile check', () => {
    expect(
      isCreatorProfileLinkedForVerification({
        displayName: 'Alex',
        bio: 'Long enough bio for summary completion',
      }),
    ).toBe(false);

    expect(
      isCreatorProfileLinkedForVerification({
        displayName: 'Alex',
        platformProfiles: {
          youtube: { platform: 'youtube', status: 'empty' },
          tiktok: {
            platform: 'tiktok',
            status: 'linked',
            profileUrl: 'https://www.tiktok.com/@alex',
          },
          instagram: { platform: 'instagram', status: 'empty' },
        },
      }),
    ).toBe(true);
  });

  it('returns preflight blockers in backend order', () => {
    expect(
      resolveCreatorVerificationPreflight({
        profile: null,
        mailboxConnected: false,
        creatorVerificationStatus: 'unverified',
      }).kind,
    ).toBe('mailbox_required');

    expect(
      resolveCreatorVerificationPreflight({
        profile: { displayName: 'Alex', bio: 'Long enough bio' },
        mailboxConnected: true,
        creatorVerificationStatus: 'unverified',
      }).kind,
    ).toBe('profile_incomplete');

    expect(
      resolveCreatorVerificationPreflight({
        profile: {
          displayName: 'Alex',
          platformProfiles: {
            youtube: { platform: 'youtube', status: 'empty' },
            tiktok: {
              platform: 'tiktok',
              status: 'linked',
              profileUrl: 'https://www.tiktok.com/@alex',
            },
            instagram: { platform: 'instagram', status: 'empty' },
          },
        },
        mailboxConnected: true,
        creatorVerificationStatus: 'unverified',
        boundMailboxEmail: 'creator@example.com',
        homepageEmail: null,
      }).kind,
    ).toBe('homepage_email_missing');

    expect(
      resolveCreatorVerificationPreflight({
        profile: {
          displayName: 'Alex',
          platformProfiles: {
            youtube: { platform: 'youtube', status: 'empty' },
            tiktok: {
              platform: 'tiktok',
              status: 'linked',
              profileUrl: 'https://www.tiktok.com/@alex',
            },
            instagram: { platform: 'instagram', status: 'empty' },
          },
        },
        mailboxConnected: true,
        creatorVerificationStatus: 'unverified',
        boundMailboxEmail: 'creator@example.com',
        homepageEmail: 'other@example.com',
      }),
    ).toMatchObject({
      kind: 'email_mismatch',
      boundMailboxEmail: 'creator@example.com',
      homepageEmail: 'other@example.com',
    });

    expect(
      resolveCreatorVerificationPreflight({
        profile: {
          displayName: 'Alex',
          platformProfiles: {
            youtube: { platform: 'youtube', status: 'empty' },
            tiktok: {
              platform: 'tiktok',
              status: 'linked',
              profileUrl: 'https://www.tiktok.com/@alex',
            },
            instagram: { platform: 'instagram', status: 'empty' },
          },
        },
        mailboxConnected: true,
        creatorVerificationStatus: 'unverified',
        boundMailboxEmail: 'creator@example.com',
        homepageEmail: 'Creator@Example.com',
      }).kind,
    ).toBe('ready');
  });
});
