export function formatExceptionalBudgetLabel(
  ratio: number | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null {
  if (ratio == null || !Number.isFinite(ratio) || ratio < 2) {
    return null;
  }
  const rounded = Math.round(ratio * 10) / 10;
  return t('inboxScreen.exceptionalBudget', { ratio: rounded });
}
