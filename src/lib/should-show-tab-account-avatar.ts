const MAIN_TAB_SEGMENTS = new Set(['index', 'inbox', 'deals', 'growth']);

/** Show the floating account avatar only on top-level tab hubs (not account or nested stacks). */
export function shouldShowTabAccountAvatar(segments: string[]): boolean {
  if (segments[0] !== '(tabs)') return false;
  if (segments[1] === 'account') return false;
  if (segments.length > 2) return false;

  // Expo Router omits the default `index` segment on Today (`/`).
  if (segments.length === 1) return true;

  const tab = segments[1];
  return !!tab && MAIN_TAB_SEGMENTS.has(tab);
}
