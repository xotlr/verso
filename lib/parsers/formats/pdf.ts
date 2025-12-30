/**
 * PDF Parser Module
 *
 * Parses PDF screenplays using position-based heuristics.
 * Uses pdf.js for text extraction with position data.
 */

import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
  ParseWarning,
} from '../types';
import { registerParser } from '../registry';
import { Scene, SceneElement, Location } from '@/types/screenplay';

// PDF.js types - loaded dynamically
type PDFDocumentProxy = {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPageProxy>;
};

type PDFPageProxy = {
  getTextContent: () => Promise<TextContent>;
  getViewport: (params: { scale: number }) => { width: number; height: number };
};

type TextContent = {
  items: TextItem[];
};

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
};

// Screenplay layout constants (US Letter, 12pt Courier proportions)
const LAYOUT = {
  // Page dimensions in points (US Letter)
  pageWidth: 612,
  pageHeight: 792,

  // Margin positions as percentages of page width
  margins: {
    sceneHeading: { leftMin: 0.10, leftMax: 0.20 },
    action: { leftMin: 0.10, leftMax: 0.20 },
    character: { leftMin: 0.35, leftMax: 0.45 },
    dialogue: { leftMin: 0.20, leftMax: 0.35 },
    parenthetical: { leftMin: 0.28, leftMax: 0.40 },
    transition: { leftMin: 0.55, leftMax: 0.75 },
  },
};

// Scene heading patterns
const SCENE_HEADING_PATTERNS = [
  /^(INT|EXT|INT\.?\/?EXT|I\.?\/?E|EST)[\.\s\-]/i,
  /^(INTERIOR|EXTERIOR)[\.\s\-]/i,
];

// Transition patterns
const TRANSITION_PATTERNS = [
  /^(FADE IN|FADE OUT|FADE TO|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT|JUMP CUT|WIPE TO):?\s*$/i,
  /^.*TO:$/,
];

interface PDFLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNum: number;
  fontName: string;
}

type ElementType =
  | 'scene-heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'unknown';

class PDFParser implements ScreenplayParser {
  readonly format = 'pdf' as const;
  readonly name = 'PDF Screenplay';
  readonly extensions = ['pdf'];
  readonly mimeTypes = ['application/pdf'];

  canParse(content: string | ArrayBuffer): boolean {
    if (content instanceof ArrayBuffer) {
      const header = new Uint8Array(content.slice(0, 5));
      const magic = String.fromCharCode(...header);
      return magic === '%PDF-';
    }
    return false;
  }

  getConfidence(content: string | ArrayBuffer): number {
    if (this.canParse(content)) {
      return 0.9;
    }
    return 0;
  }

  async parse(
    content: string | ArrayBuffer,
    options?: ParseOptions
  ): Promise<ParseOutcome> {
    const { onProgress } = options || {};
    const warnings: ParseWarning[] = [];

    try {
      onProgress?.({
        stage: 'reading',
        percent: 5,
        message: 'Loading PDF file...',
      });

      if (!(content instanceof ArrayBuffer)) {
        return {
          success: false,
          format: 'pdf',
          error: 'PDF content must be an ArrayBuffer',
          errorCode: 'INVALID_FORMAT',
          warnings: [],
        };
      }

      const pdfjsLib = await import('pdfjs-dist');
      // Use locally bundled worker instead of CDN to avoid network issues
      // Worker file is copied from node_modules during postinstall
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      onProgress?.({
        stage: 'detecting',
        percent: 10,
        message: 'Validating PDF format...',
      });

      const loadingTask = pdfjsLib.getDocument({ data: content });
      const pdf = (await loadingTask.promise) as unknown as PDFDocumentProxy;

      if (pdf.numPages === 0) {
        return {
          success: false,
          format: 'pdf',
          error: 'PDF contains no pages',
          errorCode: 'EMPTY_FILE',
          warnings: [],
        };
      }

      onProgress?.({
        stage: 'extracting',
        percent: 20,
        message: `Extracting text from ${pdf.numPages} pages...`,
      });

      const allLines: PDFLine[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        const pageLines = this.extractLinesFromPage(
          textContent,
          pageNum,
          viewport.width
        );
        allLines.push(...pageLines);

        const percent = 20 + Math.floor((pageNum / pdf.numPages) * 40);
        onProgress?.({
          stage: 'extracting',
          percent,
          message: `Extracting page ${pageNum}/${pdf.numPages}...`,
          linesProcessed: pageNum,
          totalLines: pdf.numPages,
        });
      }

      onProgress?.({
        stage: 'parsing',
        percent: 65,
        message: 'Analyzing screenplay structure...',
      });

      const { scenes, elements, titlePage, contentLines } =
        await this.parseLines(allLines, warnings, (current, total) => {
          const percent = 65 + Math.floor((current / total) * 25);
          onProgress?.({
            stage: 'parsing',
            percent,
            message: `Processing element ${current}/${total}...`,
            linesProcessed: current,
            totalLines: total,
          });
        });

      if (scenes.length === 0) {
        warnings.push({
          message: 'No scene headings detected - content may not be a properly formatted screenplay',
          severity: 'warning',
        });
      }

      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'PDF import complete',
      });

      return {
        success: true,
        format: 'pdf',
        titlePage,
        content: contentLines.join('\n'),
        scenes,
        elements,
        rawContent: allLines.map((l) => l.text).join('\n'),
        warnings,
      };
    } catch (error) {
      console.error('PDF parse error:', error);
      return {
        success: false,
        format: 'pdf',
        error:
          error instanceof Error ? error.message : 'Unknown error parsing PDF',
        errorCode: 'PARSE_ERROR',
        warnings,
      };
    }
  }

  private extractLinesFromPage(
    textContent: TextContent,
    pageNum: number,
    _pageWidth: number
  ): PDFLine[] {
    const lines: PDFLine[] = [];
    const lineMap = new Map<number, TextItem[]>();

    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      const existingKey = Array.from(lineMap.keys()).find(
        (k) => Math.abs(k - y) < 3
      );
      const key = existingKey ?? y;

      if (!lineMap.has(key)) {
        lineMap.set(key, []);
      }
      lineMap.get(key)!.push(item);
    }

    const sortedYPositions = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYPositions) {
      const items = lineMap.get(y)!;
      items.sort((a, b) => a.transform[4] - b.transform[4]);

      const text = items.map((i) => i.str).join('');
      if (text.trim()) {
        const firstItem = items[0];
        lines.push({
          text: text.trim(),
          x: firstItem.transform[4],
          y,
          width: items.reduce((sum, i) => sum + i.width, 0),
          height: firstItem.height || 12,
          pageNum,
          fontName: firstItem.fontName,
        });
      }
    }

    return lines;
  }

  private detectElementType(
    line: PDFLine,
    pageWidth: number,
    prevType: ElementType
  ): ElementType {
    const leftMargin = line.x / pageWidth;
    const text = line.text;
    const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);

    for (const pattern of SCENE_HEADING_PATTERNS) {
      if (pattern.test(text)) {
        return 'scene-heading';
      }
    }

    for (const pattern of TRANSITION_PATTERNS) {
      if (pattern.test(text)) {
        return 'transition';
      }
    }

    if (text.startsWith('(') && text.endsWith(')')) {
      return 'parenthetical';
    }

    const { margins } = LAYOUT;

    if (
      leftMargin >= margins.character.leftMin &&
      leftMargin <= margins.character.leftMax &&
      isAllCaps &&
      text.length < 40
    ) {
      return 'character';
    }

    if (
      (prevType === 'character' || prevType === 'parenthetical') &&
      leftMargin >= margins.dialogue.leftMin &&
      leftMargin <= margins.dialogue.leftMax
    ) {
      return 'dialogue';
    }

    if (
      leftMargin >= margins.dialogue.leftMin &&
      leftMargin <= margins.dialogue.leftMax &&
      !isAllCaps
    ) {
      if (prevType === 'dialogue') {
        return 'dialogue';
      }
    }

    if (leftMargin >= margins.transition.leftMin && isAllCaps) {
      return 'transition';
    }

    if (leftMargin <= margins.action.leftMax) {
      return 'action';
    }

    return 'unknown';
  }

  private async parseLines(
    lines: PDFLine[],
    warnings: ParseWarning[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{
    scenes: Scene[];
    elements: SceneElement[];
    titlePage: TitlePage;
    contentLines: string[];
  }> {
    const scenes: Scene[] = [];
    const elements: SceneElement[] = [];
    const contentLines: string[] = [];
    const titlePage: TitlePage = {};

    let currentScene: Scene | null = null;
    let sceneNumber = 0;
    let elementId = 0;
    let prevType: ElementType = 'unknown';

    const pageWidth = LAYOUT.pageWidth;
    const titlePageEndIndex = this.extractTitlePage(lines, titlePage);

    for (let i = titlePageEndIndex; i < lines.length; i++) {
      const line = lines[i];
      const elementType = this.detectElementType(line, pageWidth, prevType);

      onProgress?.(i - titlePageEndIndex, lines.length - titlePageEndIndex);

      const mappedType = this.mapElementType(elementType);

      const element: SceneElement = {
        id: `elem-${++elementId}`,
        type: mappedType,
        content: line.text,
      };

      elements.push(element);

      if (elementType === 'scene-heading') {
        if (currentScene) {
          scenes.push(currentScene);
        }

        sceneNumber++;
        const locationName = this.extractLocation(line.text);

        currentScene = {
          id: `scene-${sceneNumber}`,
          number: sceneNumber,
          heading: line.text,
          location: {
            id: `loc-${sceneNumber}`,
            name: locationName,
            type: this.extractLocationType(line.text),
            color: '#888888',
          },
          timeOfDay: this.extractTimeOfDay(line.text),
          characters: [],
          elements: [],
          synopsis: '',
        };

        contentLines.push(`\n${line.text}\n`);
      } else if (elementType === 'character') {
        const baseName = line.text.replace(/\s*\([^)]+\)\s*$/, '').trim();
        if (currentScene && !currentScene.characters.includes(baseName)) {
          currentScene.characters.push(baseName);
        }
        contentLines.push(`\n                              ${line.text}\n`);
      } else if (elementType === 'dialogue') {
        contentLines.push(`                    ${line.text}\n`);
      } else if (elementType === 'parenthetical') {
        contentLines.push(`                         ${line.text}\n`);
      } else if (elementType === 'transition') {
        contentLines.push(
          `\n                                                  ${line.text}\n`
        );
      } else {
        contentLines.push(`\n${line.text}\n`);
      }

      if (currentScene) {
        currentScene.elements.push(element);
      }

      prevType = elementType;
    }

    if (currentScene) {
      scenes.push(currentScene);
    }

    const unknownCount = elements.filter((e) => e.type === 'action').length;
    if (unknownCount > elements.length * 0.5) {
      warnings.push({
        message: 'Many elements could not be precisely classified - PDF formatting may differ from standard screenplay layout',
        severity: 'warning',
      });
    }

    return { scenes, elements, titlePage, contentLines };
  }

  private extractTitlePage(lines: PDFLine[], titlePage: TitlePage): number {
    let titlePageEnd = 0;

    const firstPageLines = lines.filter((l) => l.pageNum === 1);

    for (let i = 0; i < Math.min(firstPageLines.length, 20); i++) {
      const line = firstPageLines[i];
      const text = line.text;

      if (/^(written by|by|screenplay by)/i.test(text)) {
        titlePage.credit = text;
        titlePageEnd = i + 1;
        if (firstPageLines[i + 1]) {
          titlePage.author = firstPageLines[i + 1].text;
          titlePageEnd = i + 2;
        }
      } else if (/^draft|revision/i.test(text)) {
        titlePage.draftDate = text;
        titlePageEnd = i + 1;
      } else if (/^©|copyright/i.test(text)) {
        titlePage.copyright = text;
        titlePageEnd = i + 1;
      } else if (!titlePage.title && i < 5) {
        const pageWidth = LAYOUT.pageWidth;
        const leftMargin = line.x / pageWidth;
        if (leftMargin > 0.25 && leftMargin < 0.5) {
          titlePage.title = text;
          titlePageEnd = i + 1;
        }
      }
    }

    return titlePageEnd;
  }

  private mapElementType(type: ElementType): SceneElement['type'] {
    const mapping: Record<ElementType, SceneElement['type']> = {
      'scene-heading': 'scene-heading',
      action: 'action',
      character: 'character',
      dialogue: 'dialogue',
      parenthetical: 'parenthetical',
      transition: 'transition',
      unknown: 'action',
    };
    return mapping[type];
  }

  private extractLocation(heading: string): string {
    return heading
      .replace(/^(INT|EXT|INT\.?\/?EXT|I\.?\/?E|EST)[\.\s\-]+/i, '')
      .replace(
        /\s*[-–—]\s*(DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|LATER|CONTINUOUS|SAME).*$/i,
        ''
      )
      .trim();
  }

  private extractLocationType(heading: string): Location['type'] {
    if (/^INT[\.\s\-]/i.test(heading) || /^INTERIOR/i.test(heading)) {
      return 'INT';
    }
    if (/^EXT[\.\s\-]/i.test(heading) || /^EXTERIOR/i.test(heading)) {
      return 'EXT';
    }
    if (/^INT\.?\/?EXT|^I\.?\/?E/i.test(heading)) {
      return 'INT/EXT';
    }
    return 'INT'; // Default
  }

  private extractTimeOfDay(heading: string): Scene['timeOfDay'] {
    const match = heading.match(
      /[-–—]\s*(DAY|NIGHT|DAWN|DUSK|CONTINUOUS)/i
    );
    if (match) {
      const tod = match[1].toUpperCase();
      if (
        tod === 'DAY' ||
        tod === 'NIGHT' ||
        tod === 'DAWN' ||
        tod === 'DUSK' ||
        tod === 'CONTINUOUS'
      ) {
        return tod as Scene['timeOfDay'];
      }
    }
    return 'DAY'; // Default
  }
}

const pdfParser = new PDFParser();
registerParser(pdfParser);

export { pdfParser, PDFParser };
