import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function preparePdfUri(tempUri: string, filename: string): Promise<string> {
  if (!FileSystem.cacheDirectory) throw new Error('PDF cache unavailable');
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const target = `${FileSystem.cacheDirectory}${safeName}`;
  const existing = await FileSystem.getInfoAsync(target);
  if (existing.exists) await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.copyAsync({ from: tempUri, to: target });
  return target;
}

async function generateProposalPdfUri(html: string, filename: string): Promise<string> {
  const result = await Print.printToFileAsync({ html });
  if (!result?.uri) throw new Error('PDF generation failed');
  return preparePdfUri(result.uri, filename);
}

async function openNativePdfActions(
  html: string,
  filename: string,
  dialogTitle: string,
): Promise<void> {
  const uri = await generateProposalPdfUri(html, filename);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}

// Native platforms use the system file picker/share sheet to let the user save
// the generated file. Web has a separate direct browser-download implementation.
export const downloadProposalPdfFile = openNativePdfActions;
export const shareProposalPdfFile = openNativePdfActions;
