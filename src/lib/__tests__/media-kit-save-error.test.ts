import { ApiError } from '@/src/api/api-client';
import {
  isMediaKitSaveNetworkError,
  resolveMediaKitSaveErrorMessage,
} from '@/src/lib/media-kit-save-error';

const t = (key: string) => key;

describe('media-kit-save-error', () => {
  it('treats transport failures as network errors', () => {
    expect(isMediaKitSaveNetworkError(new ApiError(0, 'REQUEST_TIMEOUT', 'Request timed out'))).toBe(true);
    expect(isMediaKitSaveNetworkError(new Error('Failed to fetch'))).toBe(true);
  });

  it('uses distinct copy for network and validation failures', () => {
    expect(resolveMediaKitSaveErrorMessage(new ApiError(0, 'REQUEST_TIMEOUT', 'Request timed out'), t)).toBe(
      'mediaKitEditScreen.saveFailedNetworkBody',
    );
    expect(
      resolveMediaKitSaveErrorMessage(
        new ApiError(400, 'INVALID_DOCUMENT', 'Media kit document must be a JSON object'),
        t,
      ),
    ).toBe('Media kit document must be a JSON object');
    expect(resolveMediaKitSaveErrorMessage(new ApiError(400, 'INVALID_DOCUMENT', ''), t)).toBe(
      'mediaKitEditScreen.saveFailedValidationBody',
    );
    expect(resolveMediaKitSaveErrorMessage(new ApiError(500, 'INTERNAL_ERROR', 'Server error'), t)).toBe(
      'Server error',
    );
  });
});
