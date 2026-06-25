export { buildContractPdfFormData, type PickedContractPdf } from '@/src/lib/pick-contract-pdf.shared';

import * as DocumentPicker from 'expo-document-picker';

import { PARSEABLE_DOCUMENT_ACCEPT } from '@/components/mail/email-attachment-utils';

import type { PickedContractPdf } from '@/src/lib/pick-contract-pdf.shared';

export async function pickContractPdf(): Promise<PickedContractPdf | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: PARSEABLE_DOCUMENT_ACCEPT.split(','),
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) {
    return null;
  }
  const asset = result.assets[0];
  return {
    kind: 'native',
    uri: asset.uri,
    name: asset.name || 'contract.pdf',
    mimeType: asset.mimeType || 'application/pdf',
  };
}
