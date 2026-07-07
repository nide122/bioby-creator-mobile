import type { TFunction } from 'i18next';

import { ApiError } from '@/src/api/api-client';

export function isMediaKitSaveNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 0) return true;
    if (error.code === 'REQUEST_TIMEOUT') return true;
  }
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.message === 'Failed to fetch') return true;
  return false;
}

function isMediaKitSaveValidationError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 422);
}

export function resolveMediaKitSaveErrorMessage(error: unknown, t: TFunction): string {
  if (isMediaKitSaveNetworkError(error)) {
    return t('mediaKitEditScreen.saveFailedNetworkBody');
  }
  if (isMediaKitSaveValidationError(error)) {
    if (error instanceof ApiError && error.message.trim()) {
      return error.message;
    }
    return t('mediaKitEditScreen.saveFailedValidationBody');
  }
  if (error instanceof ApiError && error.message.trim()) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return t('mediaKitEditScreen.saveFailedBody');
}
