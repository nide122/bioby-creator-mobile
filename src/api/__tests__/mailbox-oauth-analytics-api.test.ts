import { normalizeGmailOAuthFailureCode } from '@/src/api/mailbox-oauth-analytics-api';

describe('normalizeGmailOAuthFailureCode', () => {
  it('maps free-form errors to a safe operational dimension', () => {
    expect(normalizeGmailOAuthFailureCode('access_denied for creator@example.com')).toBe(
      'GOOGLE_ACCESS_DENIED',
    );
  });

  it('does not retain unknown free-form error details', () => {
    expect(normalizeGmailOAuthFailureCode('unexpected creator@example.com')).toBe('GOOGLE_OAUTH_ERROR');
  });
});
