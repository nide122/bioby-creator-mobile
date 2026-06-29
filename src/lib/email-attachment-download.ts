import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { downloadEmailAttachment } from '@/src/api/mailbox-api';

export type AttachmentDownloadResult = {
  blob: Blob;
  /** blob: URL on web, file:// URI on native */
  uri: string;
  mimeType: string;
  revoke: () => void;
};

export type FetchAttachmentOptions = {
  /** Preview requests use inline disposition; downloads use attachment. */
  inline?: boolean;
  mimeType?: string | null;
};

export async function fetchEmailAttachmentBlob(
  messageId: string,
  attachmentId: string,
  filename: string,
  options: FetchAttachmentOptions = {},
): Promise<AttachmentDownloadResult> {
  const blob = await downloadEmailAttachment(messageId, attachmentId, { inline: options.inline });
  const mimeType = resolveAttachmentMimeType(filename, options.mimeType, blob.type);
  const typedBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });

  if (Platform.OS === 'web') {
    const uri = URL.createObjectURL(typedBlob);
    return {
      blob: typedBlob,
      uri,
      mimeType,
      revoke: () => URL.revokeObjectURL(uri),
    };
  }
  const base64 = await blobToBase64(typedBlob);
  const uri = `${FileSystem.cacheDirectory}${sanitizeFilename(filename)}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return {
    blob: typedBlob,
    uri,
    mimeType,
    revoke: () => {
      void FileSystem.deleteAsync(uri, { idempotent: true });
    },
  };
}

export function resolveAttachmentMimeType(
  filename: string,
  declaredMime?: string | null,
  blobMime?: string,
): string {
  const declared = normalizeMime(declaredMime);
  if (declared && declared !== 'application/octet-stream') {
    return declared;
  }
  const fromBlob = normalizeMime(blobMime);
  if (fromBlob && fromBlob !== 'application/octet-stream') {
    return fromBlob;
  }
  const ext = extension(filename);
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return fromBlob || declared || 'application/octet-stream';
  }
}

function normalizeMime(value?: string | null): string {
  return (value ?? '').split(';')[0].trim().toLowerCase();
}

function extension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-()+\s]/g, '_').trim() || 'attachment';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
