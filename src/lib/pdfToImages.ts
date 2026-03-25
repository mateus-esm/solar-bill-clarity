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
 * Custom error thrown when a PDF requires a password.
 */
export class PdfPasswordRequiredError extends Error {
  constructor() {
    super("PDF protegido por senha");
    this.name = "PdfPasswordRequiredError";
  }
}

/**
 * Custom error thrown when the provided password is incorrect.
 */
export class PdfPasswordIncorrectError extends Error {
  constructor() {
    super("Senha incorreta para este PDF");
    this.name = "PdfPasswordIncorrectError";
  }
}

/**
 * Convert a PDF file to an array of base64 PNG images (one per page).
 * By default only the first page is converted (maxPages=1).
 * Pass `password` to unlock password-protected PDFs.
 */
export async function pdfToImages(
  file: File,
  options?: { maxPages?: number; scale?: number; password?: string }
): Promise<PdfPageImage[]> {
  const { maxPages = 1, scale = 2, password } = options || {};

  const arrayBuffer = await file.arrayBuffer();

  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
    }).promise;
  } catch (err: any) {
    if (err?.name === "PasswordException") {
      if (err.code === pdfjsLib.PasswordResponses.NEED_PASSWORD) {
        throw new PdfPasswordRequiredError();
      }
      if (err.code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD) {
        throw new PdfPasswordIncorrectError();
      }
    }
    throw err;
  }

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

/**
 * Test if a PDF file requires a password. Returns true if password-protected.
 */
export async function isPdfPasswordProtected(file: File): Promise<boolean> {
  try {
    await pdfToImages(file, { maxPages: 1, scale: 0.5 });
    return false;
  } catch (err) {
    if (err instanceof PdfPasswordRequiredError) {
      return true;
    }
    return false;
  }
}
