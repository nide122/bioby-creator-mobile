import { ApiError } from '@/src/api/api-client';

export function contractSummaryErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof ApiError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return t('contractSummary.fileTooLarge');
    }
    if (error.code === 'CONTRACT_SUMMARY_FAILED') {
      const message = error.message.toLowerCase();
      if (message.includes('text layer') || message.includes('tesseract') || message.includes('vision')) {
        return t('contractSummary.scannedPdfUnavailable');
      }
      return error.message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return t('contractSummary.networkFailed');
    }
    if (error.message) {
      return error.message;
    }
  }
  return t('contractSummary.failed');
}
