import { isTodayIso } from '@/src/lib/is-today-iso';

describe('isTodayIso', () => {
  it('returns true for timestamps on the local calendar day', () => {
    const now = new Date();
    expect(isTodayIso(now.toISOString())).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isTodayIso(yesterday.toISOString())).toBe(false);
  });
});
