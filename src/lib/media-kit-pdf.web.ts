const RENDER_WIDTH_PX = 794;
const PAGE_WIDTH_PT = 595.28;

type Html2CanvasFn = (
  element: HTMLElement,
  options?: Record<string, unknown>
) => Promise<HTMLCanvasElement>;

type PdfPage = {
  drawImage: (
    image: { width: number; height: number },
    options: { x: number; y: number; width: number; height: number }
  ) => void;
};

type PdfDocumentInstance = {
  embedPng: (bytes: Uint8Array) => Promise<{ width: number; height: number }>;
  addPage: (size: [number, number]) => PdfPage;
  save: () => Promise<Uint8Array>;
};

type PdfDocumentStatic = {
  create: () => Promise<PdfDocumentInstance>;
};

async function loadWebPdfTools(): Promise<{ html2canvas: Html2CanvasFn; PDFDocument: PdfDocumentStatic }> {
  const [html2canvasModule, pdfLibModule] = await Promise.all([
    import('html2canvas/dist/html2canvas.esm.js'),
    import('pdf-lib/dist/pdf-lib.esm.js'),
  ]);

  const html2canvas = (html2canvasModule.default ?? html2canvasModule) as Html2CanvasFn;
  const PDFDocument = (pdfLibModule as { PDFDocument: PdfDocumentStatic }).PDFDocument;

  if (!html2canvas || !PDFDocument) {
    throw new Error('PDF tools unavailable');
  }

  return { html2canvas, PDFDocument };
}

async function waitForIframeRender(iframe: HTMLIFrameElement): Promise<Document> {
  await new Promise<void>((resolve) => {
    if (iframe.contentDocument?.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.onload = () => resolve();
    window.setTimeout(resolve, 400);
  });

  const doc = iframe.contentDocument;
  if (!doc?.body) {
    throw new Error('Unable to render PDF');
  }
  return doc;
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to render PDF'));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}

async function canvasToSinglePagePdfBlob(
  canvas: HTMLCanvasElement,
  PDFDocument: PdfDocumentStatic
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const pageWidthPt = PAGE_WIDTH_PT;
  const pageHeightPt = (canvas.height * pageWidthPt) / canvas.width;
  const pngBytes = await canvasToPngBytes(canvas);
  const pngImage = await pdfDoc.embedPng(pngBytes);
  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageWidthPt,
    height: pageHeightPt,
  });

  const pdfBytes = await pdfDoc.save();
  const blobBytes = new Uint8Array(pdfBytes.byteLength);
  blobBytes.set(pdfBytes);
  return new Blob([blobBytes.buffer], { type: 'application/pdf' });
}

async function htmlToPdfBlob(html: string): Promise<Blob> {
  const { html2canvas, PDFDocument } = await loadWebPdfTools();
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${RENDER_WIDTH_PX}px;border:0;visibility:hidden`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      throw new Error('Unable to render PDF');
    }
    doc.open();
    doc.write(html);
    doc.close();

    const renderedDoc = await waitForIframeRender(iframe);
    const body = renderedDoc.body;
    iframe.style.height = `${body.scrollHeight}px`;

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: body.scrollWidth,
      width: body.scrollWidth,
      height: body.scrollHeight,
    });

    return canvasToSinglePagePdfBlob(canvas, PDFDocument);
  } finally {
    iframe.remove();
  }
}

function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadGeneratedPdf(
  html: string,
  filename: string,
): Promise<void> {
  const blob = await htmlToPdfBlob(html);
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  downloadPdfBlob(blob, safeName);
}

export async function shareGeneratedPdf(
  html: string,
  filename: string,
  _dialogTitle: string
): Promise<void> {
  const blob = await htmlToPdfBlob(html);
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const file = new File([blob], safeName, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      // Desktop browsers can report file sharing support but reject the call
      // after asynchronous PDF rendering consumes the transient user gesture.
      // In that case, preserve the export action by downloading the file.
      downloadPdfBlob(blob, safeName);
      return;
    }
  }

  downloadPdfBlob(blob, safeName);
}

export async function shareGeneratedPdfOnly(
  html: string,
  filename: string,
  _dialogTitle: string,
): Promise<void> {
  const blob = await htmlToPdfBlob(html);
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const file = new File([blob], safeName, { type: 'application/pdf' });

  if (typeof navigator === 'undefined' || !navigator.canShare?.({ files: [file] })) {
    throw new Error('File sharing is not supported by this browser');
  }
  await navigator.share({ files: [file] });
}
