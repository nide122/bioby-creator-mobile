import { buildPublicProposalWebUrl, extractProposalShareToken } from '@/src/lib/proposal-public-link';

describe('proposal-public-link', () => {
  const originalPublicWebBaseUrl = process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL = 'https://app.example.com';
  });

  afterEach(() => {
    if (originalPublicWebBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL = originalPublicWebBaseUrl;
    }
  });

  it('extracts the token from relative and absolute API paths', () => {
    expect(extractProposalShareToken('/api/v1/public/proposals/token-123')).toBe('token-123');
    expect(extractProposalShareToken('https://api.example.com/api/v1/public/proposals/token-456')).toBe('token-456');
  });

  it('builds a brand-facing web URL instead of exposing the API URL', () => {
    expect(buildPublicProposalWebUrl('/api/v1/public/proposals/token-123')).toBe(
      'https://app.example.com/p/token-123',
    );
  });

  it('rejects unrelated paths', () => {
    expect(buildPublicProposalWebUrl('/api/v1/proposals/123')).toBeUndefined();
  });
});
