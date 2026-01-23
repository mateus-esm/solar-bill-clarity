import * as pdfjsLib from "pdfjs-dist";

// Use local worker bundled with pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface PdfPageImage {
  pageNumber: number;
  base64: string; // includes data: prefix
  width: number;
  height: number;
}

/**
 * Convert a PDF file to an array of base64 PNG images (one per page).
 * By default only the first page is converted (maxPages=1).
 */
export async function pdfToImages(
  file: File,
  options?: { maxPages?: number; scale?: number }
): Promise<PdfPageImage[]> {
  const { maxPages = 1, scale = 2 } = options || {};

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const images: PdfPageImage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const base64 = canvas.toDataURL("image/png");
    images.push({
      pageNumber: pageNum,
      base64,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return images;
}

/**
 * Checks if a file is a PDF.
 */
export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}
