/** Gmail mailbox OAuth scopes — keep in sync with MailboxController.googleOAuthStatus. */
export const GOOGLE_MAILBOX_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
] as const;
