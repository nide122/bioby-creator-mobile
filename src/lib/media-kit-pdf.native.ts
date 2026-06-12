import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import {
  MEDIA_KIT_PDF_SINGLE_PAGE_HEIGHT_PX,
  MEDIA_KIT_PDF_WIDTH_PX,
} from '@/src/lib/media-kit-pdf.constants';

async function prepareShareablePdfUri(tempUri: string, filename: string): Promise<string> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('PDF cache unavailable');
  }

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const shareUri = `${cacheDirectory}${safeName}`;
  const existing = await FileSystem.getInfoAsync(shareUri);
  if (existing.exists) {
    await FileSystem.deleteAsync(shareUri, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: tempUri, to: shareUri });
  return shareUri;
}

export async function shareGeneratedPdf(
  html: string,
  filename: string,
  dialogTitle: string
): Promise<void> {
  const result = await Print.printToFileAsync({
    html,
    width: MEDIA_KIT_PDF_WIDTH_PX,
    height: MEDIA_KIT_PDF_SINGLE_PAGE_HEIGHT_PX,
  });
  if (!result?.uri) {
    throw new Error('PDF generation failed');
  }

  const shareUri = await prepareShareablePdfUri(result.uri, filename);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available');
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}
