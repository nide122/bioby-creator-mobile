import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

import { downloadPipelineCsv } from '@/src/api/pipeline-api';
import type { OpportunityListFilters } from '@/src/api/opportunities-api';

function pipelineExportFilename(): string {
  return `pipeline-export-${new Date().toISOString().slice(0, 10)}.csv`;
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

export async function exportAndSharePipelineCsv(filters: OpportunityListFilters = {}): Promise<void> {
  const blob = await downloadPipelineCsv(filters);
  const filename = pipelineExportFilename();
  const typedBlob = blob.type === 'text/csv' ? blob : new Blob([blob], { type: 'text/csv' });

  if (Platform.OS === 'web') {
    const uri = URL.createObjectURL(typedBlob);
    try {
      const link = document.createElement('a');
      link.href = uri;
      link.download = filename;
      link.click();
    } finally {
      URL.revokeObjectURL(uri);
    }
    return;
  }

  const base64 = await blobToBase64(typedBlob);
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename });
      return;
    }
    await Linking.openURL(uri);
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
