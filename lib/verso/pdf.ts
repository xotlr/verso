/**
 * Verso PDF Export Module
 *
 * Uses pdf-lib to create PDFs from RenderedDocument data.
 * The WASM engine calculates all positions; this module just draws.
 */

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type {
  RenderedDocument,
  RenderedPage,
  TextItem,
  TitlePageLayout,
  FontStyle,
} from './export';

// Points per inch
const POINTS_PER_INCH = 72;

// Font cache
interface FontCache {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

/**
 * Create a PDF from a RenderedDocument.
 *
 * @param rendered - RenderedDocument from renderForExport()
 * @param fonts - Optional custom fonts (Courier Prime). If not provided, uses standard Courier.
 * @returns PDF bytes as Uint8Array
 *
 * @example
 * ```typescript
 * // Get rendered document from WASM
 * const rendered = await renderForExport(elements, config, paginationResult, metadata);
 *
 * // Create PDF
 * const pdfBytes = await createPdf(rendered);
 *
 * // Download
 * const blob = new Blob([pdfBytes], { type: 'application/pdf' });
 * const url = URL.createObjectURL(blob);
 * ```
 */
export async function createPdf(
  rendered: RenderedDocument,
  fonts?: {
    regular?: Uint8Array;
    bold?: Uint8Array;
    italic?: Uint8Array;
    boldItalic?: Uint8Array;
  }
): Promise<Uint8Array> {
  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const fontCache = await embedFonts(pdfDoc, fonts);

  // Page dimensions in points
  const pageWidthPt = rendered.page_width * POINTS_PER_INCH;
  const pageHeightPt = rendered.page_height * POINTS_PER_INCH;

  // Render title page if present
  if (rendered.title_page) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    renderTitlePage(page, rendered.title_page, fontCache, rendered);
  }

  // Render content pages
  for (const renderedPage of rendered.pages) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    renderContentPage(page, renderedPage, fontCache, rendered);
  }

  // Serialize to bytes
  return pdfDoc.save();
}

/**
 * Create and download a PDF file.
 *
 * @param rendered - RenderedDocument from renderForExport()
 * @param filename - Filename for download (default: 'screenplay.pdf')
 * @param fonts - Optional custom fonts
 */
export async function downloadPdf(
  rendered: RenderedDocument,
  filename = 'screenplay.pdf',
  fonts?: {
    regular?: Uint8Array;
    bold?: Uint8Array;
    italic?: Uint8Array;
    boldItalic?: Uint8Array;
  }
): Promise<void> {
  const pdfBytes = await createPdf(rendered, fonts);
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Embed fonts into the PDF document.
 */
async function embedFonts(
  pdfDoc: PDFDocument,
  customFonts?: {
    regular?: Uint8Array;
    bold?: Uint8Array;
    italic?: Uint8Array;
    boldItalic?: Uint8Array;
  }
): Promise<FontCache> {
  // If custom fonts provided (Courier Prime), embed them
  if (customFonts?.regular) {
    const regular = await pdfDoc.embedFont(customFonts.regular);
    const bold = customFonts.bold
      ? await pdfDoc.embedFont(customFonts.bold)
      : regular;
    const italic = customFonts.italic
      ? await pdfDoc.embedFont(customFonts.italic)
      : regular;
    const boldItalic = customFonts.boldItalic
      ? await pdfDoc.embedFont(customFonts.boldItalic)
      : bold;

    return { regular, bold, italic, boldItalic };
  }

  // Fall back to standard Courier fonts
  const regular = await pdfDoc.embedFont(StandardFonts.Courier);
  const bold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const italic = await pdfDoc.embedFont(StandardFonts.CourierOblique);
  const boldItalic = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);

  return { regular, bold, italic, boldItalic };
}

/**
 * Get the appropriate font for a given style.
 */
function getFont(fontCache: FontCache, style: FontStyle): PDFFont {
  switch (style) {
    case 'bold':
      return fontCache.bold;
    case 'italic':
      return fontCache.italic;
    case 'bolditalic':
      return fontCache.boldItalic;
    default:
      return fontCache.regular;
  }
}

/**
 * Convert Y position from top-origin (inches) to bottom-origin (points).
 * PDF coordinates start from bottom-left, but our rendered data uses top-left.
 */
function toBottomOriginY(yInches: number, pageHeightPt: number): number {
  return pageHeightPt - yInches * POINTS_PER_INCH;
}

/**
 * Convert X position from inches to points.
 */
function toPoints(inches: number): number {
  return inches * POINTS_PER_INCH;
}

/**
 * Render the title page.
 */
function renderTitlePage(
  page: PDFPage,
  titlePage: TitlePageLayout,
  fontCache: FontCache,
  rendered: RenderedDocument
): void {
  const pageHeightPt = rendered.page_height * POINTS_PER_INCH;
  const fontSize = rendered.font_size;

  // Helper to draw a text item
  const drawTextItem = (item: TextItem | undefined) => {
    if (!item) return;
    const font = getFont(fontCache, item.font_style);
    const y = toBottomOriginY(item.y, pageHeightPt);
    page.drawText(item.text, {
      x: toPoints(item.x),
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  };

  // Draw title page elements
  drawTextItem(titlePage.title);
  drawTextItem(titlePage.written_by);
  drawTextItem(titlePage.author);
  drawTextItem(titlePage.draft);
  drawTextItem(titlePage.date);
  drawTextItem(titlePage.copyright);
  drawTextItem(titlePage.revision);

  // Draw contact lines
  for (const contactLine of titlePage.contact) {
    drawTextItem(contactLine);
  }
}

/**
 * Render a content page.
 */
function renderContentPage(
  page: PDFPage,
  renderedPage: RenderedPage,
  fontCache: FontCache,
  rendered: RenderedDocument
): void {
  const pageHeightPt = rendered.page_height * POINTS_PER_INCH;
  const fontSize = rendered.font_size;

  // Draw page header
  if (renderedPage.header) {
    const header = renderedPage.header;
    const headerY = toBottomOriginY(header.y, pageHeightPt);

    // Page number (right-aligned)
    page.drawText(header.page_number + '.', {
      x: toPoints(header.page_number_x),
      y: headerY,
      size: fontSize,
      font: fontCache.regular,
      color: rgb(0, 0, 0),
    });

    // Revision indicator (left side)
    if (header.revision && header.revision_x !== undefined) {
      page.drawText(header.revision, {
        x: toPoints(header.revision_x),
        y: headerY,
        size: fontSize - 2,
        font: fontCache.regular,
        color: rgb(0.4, 0.4, 0.4), // Gray for revision
      });
    }
  }

  // Draw text items
  for (const item of renderedPage.text_items) {
    const font = getFont(fontCache, item.font_style);
    const y = toBottomOriginY(item.y, pageHeightPt);

    page.drawText(item.text, {
      x: toPoints(item.x),
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  // Draw scene numbers
  for (const sceneNum of renderedPage.scene_numbers) {
    const y = toBottomOriginY(sceneNum.y, pageHeightPt);

    // Left scene number
    page.drawText(sceneNum.number, {
      x: toPoints(sceneNum.left_x),
      y,
      size: fontSize,
      font: fontCache.bold,
      color: rgb(0, 0, 0),
    });

    // Right scene number
    page.drawText(sceneNum.number, {
      x: toPoints(sceneNum.right_x),
      y,
      size: fontSize,
      font: fontCache.bold,
      color: rgb(0, 0, 0),
    });
  }

  // Draw continuation markers
  for (const marker of renderedPage.continuations) {
    const font = getFont(fontCache, marker.font_style);
    const y = toBottomOriginY(marker.y, pageHeightPt);

    page.drawText(marker.text, {
      x: toPoints(marker.x),
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }
}

/**
 * Load Courier Prime fonts from the public directory.
 * Returns undefined if fonts are not found (will fall back to standard Courier).
 */
export async function loadCourierPrimeFonts(): Promise<{
  regular?: Uint8Array;
  bold?: Uint8Array;
  italic?: Uint8Array;
  boldItalic?: Uint8Array;
} | undefined> {
  try {
    const [regular, bold, italic, boldItalic] = await Promise.all([
      fetch('/fonts/CourierPrime-Regular.ttf').then((r) =>
        r.ok ? r.arrayBuffer() : null
      ),
      fetch('/fonts/CourierPrime-Bold.ttf').then((r) =>
        r.ok ? r.arrayBuffer() : null
      ),
      fetch('/fonts/CourierPrime-Italic.ttf').then((r) =>
        r.ok ? r.arrayBuffer() : null
      ),
      fetch('/fonts/CourierPrime-BoldItalic.ttf').then((r) =>
        r.ok ? r.arrayBuffer() : null
      ),
    ]);

    if (!regular) {
      console.warn('Courier Prime fonts not found, using standard Courier');
      return undefined;
    }

    return {
      regular: regular ? new Uint8Array(regular) : undefined,
      bold: bold ? new Uint8Array(bold) : undefined,
      italic: italic ? new Uint8Array(italic) : undefined,
      boldItalic: boldItalic ? new Uint8Array(boldItalic) : undefined,
    };
  } catch (error) {
    console.warn('Failed to load Courier Prime fonts:', error);
    return undefined;
  }
}

/**
 * High-level function to export a screenplay to PDF.
 *
 * This is the main entry point for PDF export. It:
 * 1. Loads Courier Prime fonts (if available)
 * 2. Creates the PDF from rendered data
 * 3. Returns the PDF bytes
 *
 * @param rendered - RenderedDocument from renderForExport()
 * @returns PDF bytes as Uint8Array
 */
export async function exportToPdf(rendered: RenderedDocument): Promise<Uint8Array> {
  // Try to load Courier Prime fonts
  const fonts = await loadCourierPrimeFonts();

  // Create PDF
  return createPdf(rendered, fonts);
}

/**
 * High-level function to download a screenplay as PDF.
 *
 * @param rendered - RenderedDocument from renderForExport()
 * @param filename - Filename for download (default: 'screenplay.pdf')
 */
export async function downloadAsPdf(
  rendered: RenderedDocument,
  filename = 'screenplay.pdf'
): Promise<void> {
  const pdfBytes = await exportToPdf(rendered);
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
