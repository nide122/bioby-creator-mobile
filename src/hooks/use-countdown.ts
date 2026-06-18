import { useEffect, useState } from 'react';

/** Decrements `initialSeconds` once per second until zero, then returns null. */
export function useCountdown(initialSeconds: number | null, resetNonce = 0): number | null {
  const [remaining, setRemaining] = useState<number | null>(initialSeconds);

  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds, resetNonce]);

  useEffect(() => {
    if (remaining == null || remaining <= 0) return;
    const timer = setTimeout(() => {
      setRemaining((current) => (current != null && current > 1 ? current - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return remaining;
}
