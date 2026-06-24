/** Whether the inbox should show the missing rate-card banner. */
export function shouldShowInboxRateCardBanner(input: {
  isPending: boolean;
  packageCount: number;
}): boolean {
  if (input.isPending) return false;
  return input.packageCount === 0;
}
