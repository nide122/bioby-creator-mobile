import { render, waitFor } from '@testing-library/react-native';

import { NavigationBootstrap } from '@/components/NavigationBootstrap';
import { useSessionStore } from '@/src/stores/session-store';

const mockReplace = jest.fn();
let mockPathname = '/inbox';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

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
  });

  it('redirects unauthenticated users away from workspace routes', async () => {
    render(<NavigationBootstrap />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/welcome');
    });
  });

  it('redirects authenticated but incomplete onboarding to dispatcher', async () => {
    useSessionStore.getState().signInDemo('creator@example.com');
    mockPathname = '/deals';
    mockReplace.mockClear();

    render(<NavigationBootstrap />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('redirects completed users off auth screens to inbox', async () => {
    useSessionStore.getState().jumpToWorkspaceDemo();
    mockPathname = '/welcome';
    mockReplace.mockClear();

    render(<NavigationBootstrap />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/inbox');
    });
  });

  it('does not redirect on Today tab when session is complete', async () => {
    useSessionStore.getState().jumpToWorkspaceDemo();
    mockPathname = '/';
    mockReplace.mockClear();

    render(<NavigationBootstrap />);

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
