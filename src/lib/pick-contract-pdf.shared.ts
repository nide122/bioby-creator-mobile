export type PickedContractPdf =
  | { kind: 'web'; file: File; name: string }
  | { kind: 'native'; uri: string; name: string; mimeType: string };

export function buildContractPdfFormData(picked: PickedContractPdf): FormData {
  const formData = new FormData();
  if (picked.kind === 'web') {
    formData.append('file', picked.file, picked.name);
    return formData;
  }
  formData.append('file', {
    uri: picked.uri,
    name: picked.name,
    type: picked.mimeType || 'application/pdf',
  } as unknown as Blob);
  return formData;
}
