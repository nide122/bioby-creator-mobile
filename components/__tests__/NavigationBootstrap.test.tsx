import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { NavigationBootstrap } from '@/components/NavigationBootstrap';
import { useSessionStore } from '@/src/stores/session-store';

const mockReplace = jest.fn();
let mockPathname = '/inbox';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

jest.mock('@/src/hooks/use-auth-bootstrap', () => ({
  useAuthBootstrap: () => true,
}));

jest.mock('@/src/hooks/use-session-hydrated', () => ({
  useSessionHydrated: () => true,
}));

function renderBootstrap() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationBootstrap />
    </QueryClientProvider>
  );
}

describe('NavigationBootstrap', () => {
  beforeAll(() => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockReplace.mockClear();
    useSessionStore.getState().resetDemoSession();
    mockPathname = '/inbox';
    Object.defineProperty(global, 'window', {
      value: {
        location: { search: '', hash: '' },
      },
      writable: true,
    });
  });

  it('redirects unauthenticated users away from workspace routes', async () => {
    renderBootstrap();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/home');
    });
  });

  it('redirects authenticated but incomplete onboarding to dispatcher', async () => {
    useSessionStore.getState().signInDemo('creator@example.com');
    mockPathname = '/deals';
    mockReplace.mockClear();

    renderBootstrap();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('redirects completed users off auth screens to inbox', async () => {
    useSessionStore.getState().jumpToWorkspaceDemo();
    mockPathname = '/login';
    mockReplace.mockClear();

    renderBootstrap();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/inbox');
    });
  });

  it('does not redirect on Today tab when session is complete', async () => {
    useSessionStore.getState().jumpToWorkspaceDemo();
    mockPathname = '/';
    mockReplace.mockClear();

    renderBootstrap();

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
