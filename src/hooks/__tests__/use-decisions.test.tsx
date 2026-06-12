import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { useDecisionQueue } from '@/src/hooks/use-decisions';
import { useDecisionQueueStore } from '@/src/stores/decision-queue-store';

jest.mock('@/src/lib/mock-delay', () => ({
  mockDelay: jest.fn().mockResolvedValue(undefined),
}));

let queryClient: QueryClient;

function Wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useDecisionQueue', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useDecisionQueueStore.getState().clearEntries();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('loads mock decisions and exposes a current card', async () => {
    const { result } = renderHook(() => useDecisionQueue(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.totalCount).toBeGreaterThan(0);
    expect(result.current.current?.id).toBeTruthy();
    expect(result.current.pending.some((c) => c.id === 'dec-payout-beta')).toBe(true);
  });

  it('removes deferred cards from pending', async () => {
    const { result } = renderHook(() => useDecisionQueue(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    const current = result.current.current;
    expect(current).toBeTruthy();
    if (!current) return;

    const before = result.current.pending.length;
    act(() => {
      result.current.defer(current);
    });

    await waitFor(() => {
      expect(result.current.pending.length).toBe(before - 1);
    });
    expect(result.current.deferred.some((c) => c.id === current.id)).toBe(true);
  });
});
