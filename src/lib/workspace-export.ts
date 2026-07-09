import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

import { downloadWorkspaceExportJson } from '@/src/api/account-api';

function workspaceExportFilename(): string {
  return `bioby-workspace-export-${new Date().toISOString().slice(0, 10)}.json`;
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

export async function exportAndShareWorkspaceJson(): Promise<void> {
  const blob = await downloadWorkspaceExportJson();
  const filename = workspaceExportFilename();
  const typedBlob =
    blob.type === 'application/json' ? blob : new Blob([blob], { type: 'application/json' });

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
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: filename });
      return;
    }
    await Linking.openURL(uri);
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
