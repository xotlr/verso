/**
 * Verso Export Module
 *
 * Provides functions for exporting screenplay documents to various formats.
 * Currently supports Fountain format export.
 */

import type { Element, DocumentMetadata, PageConfig, PaginationResult } from './types';

/**
 * WASM module interface for export functions.
 * This will be populated after WASM is loaded.
 */
interface VersoWasmExports {
  export_fountain: (elementsJson: string, metadataJson: string) => string;
  export_fdx: (elementsJson: string, metadataJson: string) => string;
  render_for_export: (
    elementsJson: string,
    configJson: string,
    paginationResultJson: string,
    metadataJson: string
  ) => string;
  default: () => Promise<void>;
}

let wasmModule: VersoWasmExports | null = null;
let wasmLoadPromise: Promise<VersoWasmExports> | null = null;

/**
 * Load the WASM module for export functions.
 * Uses dynamic import to avoid SSR issues.
 */
async function loadWasmModule(): Promise<VersoWasmExports> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmLoadPromise) {
    return wasmLoadPromise;
  }

  wasmLoadPromise = (async () => {
    // Dynamic import to avoid SSR issues
    // webpackIgnore tells webpack to skip static analysis of this import
    // @ts-expect-error - WASM module is loaded at runtime from public directory
    const wasm: VersoWasmExports = await import(/* webpackIgnore: true */ '/wasm/verso_pagination_engine.js');
    await wasm.default();
    wasmModule = wasm;
    return wasmModule;
  })();

  return wasmLoadPromise;
}

/**
 * Export screenplay elements to Fountain format.
 *
 * Fountain is a plain-text screenplay format widely supported by
 * screenplay editors. The output can be saved as a `.fountain` file.
 *
 * @param elements - Array of screenplay elements to export
 * @param metadata - Optional document metadata for title page
 * @returns Fountain-formatted string
 *
 * @example
 * ```typescript
 * const elements = [
 *   { id: '1', element_type: 'scene_heading', content: 'INT. OFFICE - DAY' },
 *   { id: '2', element_type: 'action', content: 'JOHN walks in.' },
 * ];
 *
 * const metadata = { title: 'My Script', author: 'John Smith' };
 * const fountain = await exportToFountain(elements, metadata);
 *
 * // Save as .fountain file
 * const blob = new Blob([fountain], { type: 'text/plain' });
 * ```
 */
export async function exportToFountain(
  elements: Element[],
  metadata?: DocumentMetadata
): Promise<string> {
  const wasm = await loadWasmModule();

  const elementsJson = JSON.stringify(elements);
  const metadataJson = metadata ? JSON.stringify(metadata) : '';

  return wasm.export_fountain(elementsJson, metadataJson);
}

/**
 * Pure TypeScript implementation of Fountain export.
 *
 * This is a fallback for environments where WASM is not available,
 * or for simpler use cases. It produces the same output as the WASM
 * implementation.
 *
 * @param elements - Array of screenplay elements to export
 * @param metadata - Optional document metadata for title page
 * @returns Fountain-formatted string
 */
export function exportToFountainSync(
  elements: Element[],
  metadata?: DocumentMetadata
): string {
  let output = '';

  // Title page metadata
  if (metadata) {
    output += formatTitlePage(metadata);
  }

  // Track previous element type for proper spacing
  let prevType: string | null = null;

  for (const element of elements) {
    output += formatElement(element, prevType);
    prevType = element.element_type;
  }

  return output;
}

/**
 * Format the title page metadata section.
 */
function formatTitlePage(metadata: DocumentMetadata): string {
  let output = '';
  let hasContent = false;

  if (metadata.title) {
    output += `Title: ${metadata.title}\n`;
    hasContent = true;
  }

  if (metadata.author) {
    output += `Author: ${metadata.author}\n`;
    hasContent = true;
  }

  if (metadata.draft) {
    output += `Draft date: ${metadata.draft}\n`;
    hasContent = true;
  }

  if (metadata.date) {
    if (metadata.draft) {
      output += `Date: ${metadata.date}\n`;
    } else {
      output += `Draft date: ${metadata.date}\n`;
    }
    hasContent = true;
  }

  if (metadata.contact) {
    output += `Contact: ${metadata.contact}\n`;
    hasContent = true;
  }

  if (metadata.copyright) {
    output += `Copyright: ${metadata.copyright}\n`;
    hasContent = true;
  }

  if (metadata.notes) {
    output += `Notes: ${metadata.notes}\n`;
    hasContent = true;
  }

  // Add blank line after title page if we had any content
  if (hasContent) {
    output += '\n';
  }

  return output;
}

/**
 * Format a single element to Fountain syntax.
 */
function formatElement(element: Element, prevType: string | null): string {
  switch (element.element_type) {
    case 'scene_heading':
      return formatSceneHeading(element, prevType);
    case 'action':
      return formatAction(element, prevType);
    case 'character':
      return formatCharacter(element, prevType);
    case 'dialogue':
      return formatDialogue(element);
    case 'parenthetical':
      return formatParenthetical(element);
    case 'transition':
      return formatTransition(element, prevType);
    case 'shot':
      return formatShot(element, prevType);
    case 'dual_dialogue_left':
      return formatDualDialogueLeft(element, prevType);
    case 'dual_dialogue_right':
      return formatDualDialogueRight(element);
    case 'act_break':
      return formatActBreak(element, prevType);
    case 'page_break':
      return '===\n\n';
    case 'blank_line':
      return '\n';
    case 'super':
    case 'chyron':
      return formatCentered(element, prevType);
    case 'flashback':
    case 'montage':
    case 'intercut':
      return formatSceneModifier(element, prevType);
    default:
      return formatAction(element, prevType);
  }
}

function formatSceneHeading(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType !== null) {
    output += '\n';
  }

  const content = element.content.toUpperCase();

  if (element.scene_number) {
    output += `${content} #${element.scene_number}#\n`;
  } else {
    output += `${content}\n`;
  }

  output += '\n';
  return output;
}

function formatAction(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType === 'dialogue' || prevType === 'parenthetical') {
    output += '\n';
  }

  output += `${element.content}\n\n`;
  return output;
}

function formatCharacter(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType && prevType !== 'dialogue' && prevType !== 'parenthetical' && prevType !== 'character') {
    output += '\n';
  }

  const content = element.content.toUpperCase();

  if (element.auto_contd) {
    output += `${content} (CONT'D)\n`;
  } else {
    output += `${content}\n`;
  }

  return output;
}

function formatDialogue(element: Element): string {
  return `${element.content}\n`;
}

function formatParenthetical(element: Element): string {
  const content = element.content.trim();

  if (content.startsWith('(') && content.endsWith(')')) {
    return `${content}\n`;
  } else {
    return `(${content})\n`;
  }
}

function formatTransition(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType !== null) {
    output += '\n';
  }

  const content = element.content.toUpperCase();
  output += `> ${content}\n\n`;
  return output;
}

function formatShot(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType !== null) {
    output += '\n';
  }

  output += `${element.content.toUpperCase()}\n\n`;
  return output;
}

function formatDualDialogueLeft(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType && prevType !== 'dialogue' && prevType !== 'parenthetical' && prevType !== 'character') {
    output += '\n';
  }

  output += `${element.content.toUpperCase()}\n`;
  return output;
}

function formatDualDialogueRight(element: Element): string {
  const content = element.content.toUpperCase();
  return `${content} ^\n`;
}

function formatActBreak(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType !== null) {
    output += '\n';
  }

  const content = element.content.toUpperCase();
  output += `> ${content} <\n\n`;
  return output;
}

function formatCentered(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType !== null) {
    output += '\n';
  }

  const content = element.content.toUpperCase();
  output += `> ${content} <\n\n`;
  return output;
}

function formatSceneModifier(element: Element, prevType: string | null): string {
  let output = '';

  if (prevType !== null) {
    output += '\n';
  }

  const content = element.content.toUpperCase();
  output += `${content}\n\n`;
  return output;
}

/**
 * Create a downloadable Fountain file from elements.
 *
 * @param elements - Array of screenplay elements
 * @param metadata - Optional document metadata
 * @param filename - Filename for the download (default: 'screenplay.fountain')
 */
export function downloadAsFountain(
  elements: Element[],
  metadata?: DocumentMetadata,
  filename = 'screenplay.fountain'
): void {
  const fountain = exportToFountainSync(elements, metadata);
  const blob = new Blob([fountain], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================================================
// FDX (Final Draft) Export Functions
// ============================================================================

/**
 * Export screenplay elements to FDX (Final Draft) format.
 *
 * FDX is Final Draft's XML-based screenplay format, widely used in the
 * professional screenwriting industry. The output can be saved as a `.fdx`
 * file and opened by Final Draft or other FDX-compatible applications.
 *
 * @param elements - Array of screenplay elements to export
 * @param metadata - Optional document metadata for title page
 * @returns FDX-formatted XML string
 *
 * @example
 * ```typescript
 * const elements = [
 *   { id: '1', element_type: 'scene_heading', content: 'INT. OFFICE - DAY' },
 *   { id: '2', element_type: 'action', content: 'JOHN walks in.' },
 *   { id: '3', element_type: 'character', content: 'JOHN' },
 *   { id: '4', element_type: 'dialogue', content: 'Hello, is anyone here?' },
 * ];
 *
 * const metadata = { title: 'My Script', author: 'John Smith' };
 * const fdx = await exportToFdx(elements, metadata);
 *
 * // Save as .fdx file
 * const blob = new Blob([fdx], { type: 'application/xml' });
 * ```
 */
export async function exportToFdx(
  elements: Element[],
  metadata?: DocumentMetadata
): Promise<string> {
  const wasm = await loadWasmModule();

  const elementsJson = JSON.stringify(elements);
  const metadataJson = metadata ? JSON.stringify(metadata) : '';

  return wasm.export_fdx(elementsJson, metadataJson);
}

/**
 * Pure TypeScript implementation of FDX export.
 *
 * This is a fallback for environments where WASM is not available,
 * or for simpler use cases. It produces the same output as the WASM
 * implementation.
 *
 * @param elements - Array of screenplay elements to export
 * @param metadata - Optional document metadata for title page
 * @returns FDX-formatted XML string
 */
export function exportToFdxSync(
  elements: Element[],
  metadata?: DocumentMetadata
): string {
  let xml = '';

  // XML declaration and root element
  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<FinalDraft DocumentType="Script" Template="No" Version="5">\n';

  // Content section
  xml += '  <Content>\n';
  for (const element of elements) {
    xml += formatFdxParagraph(element);
  }
  xml += '  </Content>\n';

  // Title page if metadata exists and has content
  if (metadata && !isMetadataEmpty(metadata)) {
    xml += formatFdxTitlePage(metadata);
  }

  xml += '</FinalDraft>\n';
  return xml;
}

/**
 * Convert an element type to its FDX Paragraph Type string.
 */
function elementTypeToFdx(elementType: string): string {
  switch (elementType) {
    case 'scene_heading':
      return 'Scene Heading';
    case 'action':
      return 'Action';
    case 'character':
      return 'Character';
    case 'dialogue':
      return 'Dialogue';
    case 'parenthetical':
      return 'Parenthetical';
    case 'transition':
      return 'Transition';
    case 'shot':
      return 'Shot';
    case 'super':
    case 'chyron':
    case 'act_break':
    case 'page_break':
    case 'blank_line':
      return 'Action';
    case 'flashback':
    case 'montage':
    case 'intercut':
      return 'Scene Heading';
    case 'dual_dialogue_left':
    case 'dual_dialogue_right':
      return 'Character';
    default:
      return 'Action';
  }
}

/**
 * Format a single element as an FDX Paragraph element.
 */
function formatFdxParagraph(element: Element): string {
  const fdxType = elementTypeToFdx(element.element_type);
  const escapedContent = escapeXml(element.content);

  // Build attributes
  let attrs = `Type="${fdxType}"`;

  // Add scene number for scene headings if present
  if (element.element_type === 'scene_heading' && element.scene_number) {
    attrs += ` Number="${escapeXml(element.scene_number)}"`;
  }

  // Handle dual dialogue
  if (
    element.element_type === 'dual_dialogue_left' ||
    element.element_type === 'dual_dialogue_right'
  ) {
    attrs += ' DualDialogue="Yes"';
  }

  // Handle CONT'D for characters
  const displayContent =
    element.element_type === 'character' && element.auto_contd
      ? `${escapedContent} (CONT'D)`
      : escapedContent;

  return `    <Paragraph ${attrs}>\n      <Text>${displayContent}</Text>\n    </Paragraph>\n`;
}

/**
 * Format the title page section of the FDX document.
 */
function formatFdxTitlePage(metadata: DocumentMetadata): string {
  let xml = '';

  xml += '  <TitlePage>\n';
  xml += '    <Content>\n';

  // Title
  if (metadata.title) {
    xml += formatFdxTitleParagraph('Title', escapeXml(metadata.title));
  }

  // Author (with "Written by" convention)
  if (metadata.author) {
    xml += formatFdxTitleParagraph('Author', 'Written by');
    xml += formatFdxTitleParagraph('Author', escapeXml(metadata.author));
  }

  // Draft info
  if (metadata.draft) {
    xml += formatFdxTitleParagraph('Draft', escapeXml(metadata.draft));
  }

  // Date
  if (metadata.date) {
    xml += formatFdxTitleParagraph('Draft', escapeXml(metadata.date));
  }

  // Contact
  if (metadata.contact) {
    // Contact may have multiple lines, split them
    for (const line of metadata.contact.split('\n')) {
      xml += formatFdxTitleParagraph('Contact', escapeXml(line));
    }
  }

  // Copyright
  if (metadata.copyright) {
    xml += formatFdxTitleParagraph('Contact', escapeXml(metadata.copyright));
  }

  // Notes
  if (metadata.notes) {
    xml += formatFdxTitleParagraph('Contact', escapeXml(metadata.notes));
  }

  xml += '    </Content>\n';
  xml += '  </TitlePage>\n';

  return xml;
}

/**
 * Format a single title page paragraph.
 */
function formatFdxTitleParagraph(paraType: string, content: string): string {
  return `      <Paragraph Type="${paraType}">\n        <Text>${content}</Text>\n      </Paragraph>\n`;
}

/**
 * Escape special XML characters in a string.
 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Check if metadata is empty.
 */
function isMetadataEmpty(metadata: DocumentMetadata): boolean {
  return (
    !metadata.title &&
    !metadata.author &&
    !metadata.contact &&
    !metadata.draft &&
    !metadata.date &&
    !metadata.copyright &&
    !metadata.notes &&
    !metadata.revision_color
  );
}

/**
 * Create a downloadable FDX (Final Draft) file from elements.
 *
 * @param elements - Array of screenplay elements
 * @param metadata - Optional document metadata
 * @param filename - Filename for the download (default: 'screenplay.fdx')
 */
export function downloadAsFdx(
  elements: Element[],
  metadata?: DocumentMetadata,
  filename = 'screenplay.fdx'
): void {
  const fdx = exportToFdxSync(elements, metadata);
  const blob = new Blob([fdx], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================================================
// Render for Export (PDF preparation)
// ============================================================================

/**
 * Font style for text rendering
 */
export type FontStyle = 'regular' | 'bold' | 'italic' | 'bolditalic';

/**
 * A single text item to be rendered
 */
export interface TextItem {
  /** X position in inches from left edge */
  x: number;
  /** Y position in inches from top edge */
  y: number;
  /** Text content (single line, already wrapped) */
  text: string;
  /** Font style */
  font_style: FontStyle;
  /** Original element type (for debugging/styling) */
  element_type?: string;
}

/**
 * Scene number positioned on a page
 */
export interface SceneNumber {
  /** Scene number text (e.g., "1", "2A") */
  number: string;
  /** Y position in inches from top edge */
  y: number;
  /** Left X position (for left scene number) */
  left_x: number;
  /** Right X position (for right scene number) */
  right_x: number;
}

/**
 * Page header information
 */
export interface PageHeader {
  /** Page number/identifier to display */
  page_number: string;
  /** X position for page number (right-aligned) */
  page_number_x: number;
  /** Y position for header */
  y: number;
  /** Optional revision indicator */
  revision?: string;
  /** X position for revision (left side) */
  revision_x?: number;
}

/**
 * Continuation marker (MORE, CONT'D, CONTINUED)
 */
export interface ContinuationMarker {
  /** Marker text */
  text: string;
  /** X position in inches */
  x: number;
  /** Y position in inches */
  y: number;
  /** Font style */
  font_style: FontStyle;
}

/**
 * A rendered page ready for PDF export
 */
export interface RenderedPage {
  /** Page identifier (for display) */
  page_number: string;
  /** Whether this is a title page */
  is_title_page: boolean;
  /** Page header (not shown on title page) */
  header?: PageHeader;
  /** Text items to render */
  text_items: TextItem[];
  /** Scene numbers on this page */
  scene_numbers: SceneNumber[];
  /** Continuation markers */
  continuations: ContinuationMarker[];
}

/**
 * Title page layout information
 */
export interface TitlePageLayout {
  title?: TextItem;
  written_by?: TextItem;
  author?: TextItem;
  draft?: TextItem;
  date?: TextItem;
  contact: TextItem[];
  copyright?: TextItem;
  revision?: TextItem;
}

/**
 * Complete rendered document ready for PDF export
 */
export interface RenderedDocument {
  /** Page width in inches */
  page_width: number;
  /** Page height in inches */
  page_height: number;
  /** Left margin in inches */
  margin_left: number;
  /** Right margin in inches */
  margin_right: number;
  /** Top margin in inches */
  margin_top: number;
  /** Bottom margin in inches */
  margin_bottom: number;
  /** Font size in points */
  font_size: number;
  /** Line height in points */
  line_height: number;
  /** Character width in inches (for Courier) */
  char_width: number;
  /** Title page layout (if present) */
  title_page?: TitlePageLayout;
  /** Content pages */
  pages: RenderedPage[];
  /** Total page count (including title page) */
  total_pages: number;
}

/**
 * Render paginated screenplay to a structure ready for PDF export.
 *
 * This function transforms PaginationResult into a RenderedDocument containing
 * all positions, text, and styling information. The JavaScript side then uses
 * pdf-lib to create the actual PDF from this data.
 *
 * @param elements - Array of screenplay elements to export
 * @param config - PageConfig used for pagination
 * @param paginationResult - Result from pagination (pages, positions, etc.)
 * @param metadata - Optional document metadata for title page
 * @returns RenderedDocument with all positions and text ready for PDF rendering
 *
 * @example
 * ```typescript
 * // First paginate the document
 * const paginationResult = await paginateDocument(elements, config);
 *
 * // Then render for export
 * const rendered = await renderForExport(elements, config, paginationResult, metadata);
 *
 * // Use pdf-lib to create PDF
 * const pdfBytes = await createPdfFromRendered(rendered);
 * ```
 */
export async function renderForExport(
  elements: Element[],
  config: PageConfig,
  paginationResult: PaginationResult,
  metadata?: DocumentMetadata
): Promise<RenderedDocument> {
  const wasm = await loadWasmModule();

  const elementsJson = JSON.stringify(elements);
  const configJson = JSON.stringify(config);
  const paginationResultJson = JSON.stringify(paginationResult);
  const metadataJson = metadata ? JSON.stringify(metadata) : '';

  const resultJson = wasm.render_for_export(elementsJson, configJson, paginationResultJson, metadataJson);
  return JSON.parse(resultJson) as RenderedDocument;
}
