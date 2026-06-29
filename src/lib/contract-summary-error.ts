import { ApiError } from '@/src/api/api-client';

export function contractSummaryErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (error instanceof ApiError) {
    if (error.code === 'BRIEF_NOT_CONFIRMED') {
      return t('contractSummary.saveContractBlockedHint');
    }
    if (error.code === 'FILE_TOO_LARGE') {
      return t('contractSummary.fileTooLarge');
    }
    if (error.code === 'CONTRACT_SUMMARY_FAILED') {
      const message = error.message.toLowerCase();
      if (
        message.includes('text layer') ||
        message.includes('tesseract') ||
        message.includes('vision') ||
        message.includes('document_ocr_vision') ||
        message.includes('scanned document ocr failed')
      ) {
        return t('contractSummary.scannedPdfUnavailable');
      }
      if (
        message.includes('extracting response') ||
        message.includes('non-json') ||
        message.includes('response body was empty') ||
        message.includes('invalid response')
      ) {
        return t('contractSummary.scannedPdfUnavailable');
      }
      if (message.includes('exceeds the maximum length') || message.includes('too large to process')) {
        return t('contractSummary.fileTooLarge');
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
