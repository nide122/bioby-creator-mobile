export type DeliveryUploadId = 'script' | 'rough' | 'final';

const UPLOAD_IDS: DeliveryUploadId[] = ['script', 'rough', 'final'];

export function asDeliveryUploadId(value: string): DeliveryUploadId | null {
  return UPLOAD_IDS.includes(value as DeliveryUploadId) ? (value as DeliveryUploadId) : null;
}

export function isUploadRegistered(state: string): boolean {
  const trimmed = state.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || lower === 'not started' || lower === 'uploading') {
    return false;
  }
  return /upload|approv|review|deliver|brand review|ready for verification/i.test(trimmed);
}

/** i18n key suffixes under dealDeliveryScreen.uploadSteps.{id} */
export type DeliveryUploadCopyKey =
  | 'cta'
  | 'primaryCta'
  | 'statePending'
  | 'stateDone'
  | 'successTitle'
  | 'successBody'
  | 'guide';

export function deliveryUploadCopyKey(id: DeliveryUploadId, key: DeliveryUploadCopyKey): string {
  return `dealDeliveryScreen.uploadSteps.${id}.${key}`;
}
