export { buildContractPdfFormData, type PickedContractPdf } from '@/src/lib/pick-contract-pdf.shared';

import type { PickedContractPdf } from '@/src/lib/pick-contract-pdf.shared';

export async function pickContractPdf(): Promise<PickedContractPdf | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      resolve({ kind: 'web', file, name: file.name || 'contract.pdf' });
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}
