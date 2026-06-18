import { renderHook, act } from '@testing-library/react-native';

import { useCountdown } from '@/src/hooks/use-countdown';

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts down to null', () => {
    const { result, rerender } = renderHook(({ seed }) => useCountdown(seed), {
      initialProps: { seed: 3 as number | null },
    });

    expect(result.current).toBe(3);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBeNull();

    rerender({ seed: 2 });
    expect(result.current).toBe(2);
  });
});
