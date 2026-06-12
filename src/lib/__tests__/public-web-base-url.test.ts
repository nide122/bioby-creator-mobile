import { getPublicWebBaseUrl } from '@/src/lib/public-web-base-url';

describe('public-web-base-url', () => {
  const originalPublicWebBaseUrl = process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (originalPublicWebBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL = originalPublicWebBaseUrl;
    }
    if (originalApiBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it('prefers EXPO_PUBLIC_PUBLIC_WEB_BASE_URL', () => {
    process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL = 'https://app.example.com';
    jest.resetModules();
    expect(require('@/src/lib/public-web-base-url').getPublicWebBaseUrl()).toBe('https://app.example.com');
  });

  it('derives localhost web origin from API base URL', () => {
    delete process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8080';
    jest.resetModules();
    expect(require('@/src/lib/public-web-base-url').getPublicWebBaseUrl()).toBe('http://localhost:8081');
  });

  it('never falls back to bioby.app', () => {
    delete process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.resetModules();
    expect(require('@/src/lib/public-web-base-url').getPublicWebBaseUrl()).toBe('http://localhost:8081');
  });
});
