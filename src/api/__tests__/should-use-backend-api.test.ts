import { isApiConfigured } from '@/src/api/api-config';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useSessionStore } from '@/src/stores/session-store';

jest.mock('@/src/api/api-config', () => ({
  isApiConfigured: jest.fn(),
}));

const mockedIsApiConfigured = isApiConfigured as jest.MockedFunction<typeof isApiConfigured>;

describe('shouldUseBackendApi', () => {
  beforeEach(() => {
    mockedIsApiConfigured.mockReturnValue(false);
    useSessionStore.getState().resetDemoSession();
  });

  it('is false when API URL is not configured', () => {
    mockedIsApiConfigured.mockReturnValue(false);
    useSessionStore.getState().jumpToWorkspaceDemo();
    expect(shouldUseBackendApi()).toBe(false);
  });

  it('is false in local demo workspace even when API URL is configured', () => {
    mockedIsApiConfigured.mockReturnValue(true);
    useSessionStore.getState().jumpToWorkspaceDemo();
    expect(shouldUseBackendApi()).toBe(false);
  });

  it('is true when API URL is configured and not in local demo workspace', () => {
    mockedIsApiConfigured.mockReturnValue(true);
    expect(shouldUseBackendApi()).toBe(true);
  });
});
