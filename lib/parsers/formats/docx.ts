/**
 * DOCX Parser Module
 *
 * Parses Microsoft Word (.docx) screenplay files.
 * DOCX files are ZIP archives containing XML content.
 */

import JSZip from 'jszip';
import {
  ScreenplayParser,
  ParseOptions,
  ParseOutcome,
  TitlePage,
  ParseWarning,
} from '../types';
import { registerParser } from '../registry';
import { isZipFile } from '../detector';
import { Scene, SceneElement, Location } from '@/types/screenplay';

// Scene heading patterns
const SCENE_HEADING_PATTERNS = [
  /^(INT|EXT|INT\.?\/?EXT|I\.?\/?E|EST)[\.\s\-]/i,
  /^(INTERIOR|EXTERIOR)[\.\s\-]/i,
  // Numbered scene headings: "1.INT.", "1A.EXT.", "23.INT.", "1. INT."
  /^\d+[A-Z]?\.?\s*(INT|EXT|INT\.?\/?EXT|I\.?\/?E|EST)[\.\s\-]/i,
];

// Transition patterns
const TRANSITION_PATTERNS = [
  /^(FADE IN|FADE OUT|FADE TO|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT|JUMP CUT|WIPE TO):?\s*$/i,
  /^(BACK TO|FLASH TO|TIME CUT|INTERCUT|END FLASHBACK|END DREAM|END MONTAGE):?\s*$/i,
  /^BACK TO (PRESENT|SCENE|REALITY)\.?$/i,
  /^(FLASHBACK|DREAM SEQUENCE|MONTAGE|SERIES OF SHOTS):?\s*$/i,
  /^LATER\.?$/i,
  /^CONTINUOUS\.?$/i,
  /^.*TO:$/, // Catch-all for "SOMETHING TO:" format
];

// Common Word screenplay style names
const STYLE_MAPPINGS: Record<string, SceneElement['type']> = {
  'Scene Heading': 'scene-heading',
  'SceneHeading': 'scene-heading',
  'SCENE HEADING': 'scene-heading',
  'Slugline': 'scene-heading',
  'Action': 'action',
  'ACTION': 'action',
  'Description': 'action',
  'Character': 'character',
  'CHARACTER': 'character',
  'Dialogue': 'dialogue',
  'DIALOGUE': 'dialogue',
  'Parenthetical': 'parenthetical',
  'PARENTHETICAL': 'parenthetical',
  'Transition': 'transition',
  'TRANSITION': 'transition',
  'Scene': 'scene-heading',
  'Slug': 'scene-heading',
  'Dialog': 'dialogue',
  'Paren': 'parenthetical',
  'Trans': 'transition',
};

// Indentation-based detection thresholds (in twips - 1 inch = 1440 twips)
// Made more lenient to handle various Word templates
const INDENT_THRESHOLDS = {
  character: { min: 1800, max: 5040 },
  dialogue: { min: 720, max: 3600 },
  parenthetical: { min: 1440, max: 4320 },
  transition: { min: 3600 },
};

// Character name patterns - used for fallback detection
// Must start with letter, contain mostly letters, optional parenthetical extension
const CHARACTER_NAME_PATTERN = /^[A-Z][A-Z\s'.,-]*[A-Z](?:\s*\([^)]+\))?$/;
// Matches: "JOHN", "JOHN SMITH", "DR. SMITH", "MARY JANE (V.O.)", "O'BRIEN"
// Single letter names need special handling

// Check if text contains at least one letter (filters out "112", "2024", etc.)
const HAS_LETTER = /[A-Za-z]/;

// Lines that look like action even if ALL CAPS
const ACTION_INDICATORS = [
  /^(THE|A|AN|HE|SHE|THEY|WE|IT|THIS|THAT|THESE|THOSE)\s/i,
  /\.\s*$/,  // Ends with period (likely a sentence)
  /,\s*$/,   // Ends with comma
  /\band\b/i, // Contains "and"
  /\bthe\b/i, // Contains "the"
  /\bis\b/i,  // Contains "is"
  /\bare\b/i, // Contains "are"
  /\bwas\b/i, // Contains "was"
  /\bwere\b/i, // Contains "were"
  /\bwith\b/i, // Contains "with"
  /\binto\b/i, // Contains "into"
  /\bfrom\b/i, // Contains "from"
  /^\d+$/, // Pure numbers
  /^\d+[A-Z]?$/, // Numbers with optional letter suffix (like "112A")
  /^[A-Z]?\d+$/, // Optional letter prefix with numbers
];

interface DocxParagraph {
  text: string;
  styleName?: string;
  indentLeft?: number;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  isBold?: boolean;
  isAllCaps?: boolean;
}

class DocxParser implements ScreenplayParser {
  readonly format = 'docx' as const;
  readonly name = 'Microsoft Word';
  readonly extensions = ['docx'];
  readonly mimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  canParse(content: string | ArrayBuffer): boolean {
    return isZipFile(content);
  }

  getConfidence(content: string | ArrayBuffer): number {
    if (!isZipFile(content)) {
      return 0;
    }
    return 0.3;
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
        message: 'Reading DOCX file...',
      });

      const arrayBuffer =
        content instanceof ArrayBuffer
          ? content
          : new TextEncoder().encode(content).buffer;

      onProgress?.({
        stage: 'extracting',
        percent: 15,
        message: 'Extracting DOCX package...',
      });

      const zip = await JSZip.loadAsync(arrayBuffer);

      const documentFile = zip.file('word/document.xml');
      if (!documentFile) {
        return {
          success: false,
          format: 'docx',
          error: 'Not a valid DOCX file - missing document.xml',
          errorCode: 'INVALID_FORMAT',
          warnings: [],
        };
      }

      onProgress?.({
        stage: 'detecting',
        percent: 25,
        message: 'Validating DOCX structure...',
      });

      const documentXml = await documentFile.async('string');

      const stylesFile = zip.file('word/styles.xml');
      const stylesXml = stylesFile ? await stylesFile.async('string') : null;
      const styleMap = stylesXml ? this.parseStyles(stylesXml) : new Map();

      onProgress?.({
        stage: 'parsing',
        percent: 40,
        message: 'Parsing document content...',
      });

      const paragraphs = this.parseDocument(documentXml, styleMap);

      if (paragraphs.length === 0) {
        return {
          success: false,
          format: 'docx',
          error: 'Document appears to be empty',
          errorCode: 'EMPTY_FILE',
          warnings: [],
        };
      }

      const { scenes, elements, titlePage, contentLines } =
        await this.convertToScreenplay(paragraphs, warnings, (current, total) => {
          const percent = 40 + Math.floor((current / total) * 50);
          onProgress?.({
            stage: 'parsing',
            percent,
            message: `Processing paragraph ${current}/${total}...`,
            linesProcessed: current,
            totalLines: total,
          });
        });

      if (!paragraphs.some((p) => p.styleName)) {
        warnings.push({
          message: 'No screenplay styles detected in document - element detection was based on text patterns and indentation',
          severity: 'info',
        });
      }

      onProgress?.({
        stage: 'complete',
        percent: 100,
        message: 'DOCX import complete',
      });

      return {
        success: true,
        format: 'docx',
        titlePage,
        content: contentLines.join('\n'),
        scenes,
        elements,
        rawContent: paragraphs.map((p) => p.text).join('\n'),
        warnings,
      };
    } catch (error) {
      console.error('DOCX parse error:', error);

      if (error instanceof Error && error.message.includes('not a valid zip')) {
        return {
          success: false,
          format: 'docx',
          error: 'File is not a valid DOCX document',
          errorCode: 'INVALID_FORMAT',
          warnings: [],
        };
      }

      return {
        success: false,
        format: 'docx',
        error:
          error instanceof Error ? error.message : 'Unknown error parsing DOCX',
        errorCode: 'PARSE_ERROR',
        warnings,
      };
    }
  }

  private parseStyles(stylesXml: string): Map<string, string> {
    const styleMap = new Map<string, string>();

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(stylesXml, 'text/xml');
      const styles = doc.getElementsByTagName('w:style');

      for (let i = 0; i < styles.length; i++) {
        const style = styles[i];
        const styleId = style.getAttribute('w:styleId');
        const nameEl = style.getElementsByTagName('w:name')[0];
        const styleName = nameEl?.getAttribute('w:val');

        if (styleId && styleName) {
          styleMap.set(styleId, styleName);
        }
      }
    } catch (error) {
      console.warn('Error parsing styles.xml:', error);
    }

    return styleMap;
  }

  private parseDocument(
    documentXml: string,
    styleMap: Map<string, string>
  ): DocxParagraph[] {
    const paragraphs: DocxParagraph[] = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(documentXml, 'text/xml');
      const pElements = doc.getElementsByTagName('w:p');

      for (let i = 0; i < pElements.length; i++) {
        const p = pElements[i];
        // parseParagraph now returns an array (splits on <w:br> line breaks)
        const logicalLines = this.parseParagraph(p, styleMap);
        paragraphs.push(...logicalLines);
      }
    } catch (error) {
      console.warn('Error parsing document.xml:', error);
    }

    return paragraphs;
  }

  /**
   * Recursively extract text from an element, using a special marker for line breaks.
   * Returns text with \x00 markers where <w:br> elements occur.
   */
  private extractTextFromElement(element: Element): string {
    let result = '';
    const tagName = element.tagName || element.nodeName;

    // Handle specific DOCX elements
    if (tagName === 'w:t') {
      return element.textContent || '';
    } else if (tagName === 'w:br') {
      // Use null character as line break marker (will be split later)
      return '\x00';
    } else if (tagName === 'w:tab') {
      return ' ';
    } else if (tagName === 'w:pPr' || tagName === 'w:rPr') {
      // Skip property elements - they don't contain text
      return '';
    }

    // Recurse into children
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === 1) { // Element node
        result += this.extractTextFromElement(child as Element);
      }
    }

    return result;
  }

  /**
   * Parse a paragraph, potentially returning multiple logical lines if the paragraph
   * contains line breaks (<w:br>). Screenplays often put character/parenthetical/dialogue
   * in a single paragraph separated by line breaks.
   */
  private parseParagraph(
    p: Element,
    styleMap: Map<string, string>
  ): DocxParagraph[] {
    // Extract text with line break markers
    const rawText = this.extractTextFromElement(p);

    // Split on line break markers
    const lines = rawText.split('\x00').map(line => line.replace(/\s+/g, ' ').trim()).filter(line => line.length > 0);

    // If no lines or only one line, return single paragraph
    if (lines.length === 0) {
      return [];
    }

    // Get paragraph-level properties (apply to first line primarily)
    const pPr = p.getElementsByTagName('w:pPr')[0];
    const pStyle = pPr?.getElementsByTagName('w:pStyle')[0];
    const styleId = pStyle?.getAttribute('w:val');
    const styleName = styleId ? styleMap.get(styleId) : undefined;

    const ind = pPr?.getElementsByTagName('w:ind')[0];
    const indentLeft = ind
      ? parseInt(ind.getAttribute('w:left') || '0', 10)
      : 0;

    const jc = pPr?.getElementsByTagName('w:jc')[0];
    const alignmentValue = jc?.getAttribute('w:val');
    const alignment = alignmentValue as DocxParagraph['alignment'];

    // Return multiple paragraphs for multi-line content
    return lines.map((text, index) => {
      const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
      return {
        text,
        // Only first line gets the style name (usually the character name)
        styleName: index === 0 ? styleName : undefined,
        indentLeft: index === 0 ? indentLeft : 0,
        alignment: index === 0 ? alignment : undefined,
        isBold: false, // Would need per-run tracking for accuracy
        isAllCaps,
      };
    });
  }

  private async convertToScreenplay(
    paragraphs: DocxParagraph[],
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
    let prevType: SceneElement['type'] = 'action';

    const titlePageEnd = this.extractTitlePage(paragraphs, titlePage);

    for (let i = titlePageEnd; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      onProgress?.(i - titlePageEnd, paragraphs.length - titlePageEnd);

      // Check for merged character+dialogue (e.g., "OPERATOR (V.O.)Hallo? Ist da jemand?")
      const mergedSplit = this.trySplitMergedCharacterDialogue(para.text);
      if (mergedSplit) {
        // Add character element
        const charElement: SceneElement = {
          id: `elem-${++elementId}`,
          type: 'character',
          content: mergedSplit.character,
        };
        elements.push(charElement);

        const baseName = mergedSplit.character.replace(/\s*\([^)]+\)\s*$/, '').trim();
        if (currentScene && !currentScene.characters.includes(baseName)) {
          currentScene.characters.push(baseName);
        }
        contentLines.push(`\n                              ${mergedSplit.character}\n`);

        if (currentScene) {
          currentScene.elements.push(charElement);
        }

        // Add dialogue element
        const dialogueElement: SceneElement = {
          id: `elem-${++elementId}`,
          type: 'dialogue',
          content: mergedSplit.dialogue,
        };
        elements.push(dialogueElement);
        contentLines.push(`                    ${mergedSplit.dialogue}\n`);

        if (currentScene) {
          currentScene.elements.push(dialogueElement);
        }

        prevType = 'dialogue';
        continue;
      }

      const elementType = this.detectElementType(para, prevType);

      const element: SceneElement = {
        id: `elem-${++elementId}`,
        type: elementType,
        content: para.text,
      };

      elements.push(element);

      if (elementType === 'scene-heading') {
        if (currentScene) {
          scenes.push(currentScene);
        }

        sceneNumber++;
        const locationName = this.extractLocation(para.text);

        currentScene = {
          id: `scene-${sceneNumber}`,
          number: sceneNumber,
          heading: para.text,
          location: {
            id: `loc-${sceneNumber}`,
            name: locationName,
            type: this.extractLocationType(para.text),
            color: '#888888',
          },
          timeOfDay: this.extractTimeOfDay(para.text),
          characters: [],
          elements: [],
          synopsis: '',
        };

        contentLines.push(`\n${para.text}\n`);
      } else if (elementType === 'character') {
        const baseName = para.text.replace(/\s*\([^)]+\)\s*$/, '').trim();
        if (currentScene && !currentScene.characters.includes(baseName)) {
          currentScene.characters.push(baseName);
        }
        contentLines.push(`\n                              ${para.text}\n`);
      } else if (elementType === 'dialogue') {
        contentLines.push(`                    ${para.text}\n`);
      } else if (elementType === 'parenthetical') {
        contentLines.push(`                         ${para.text}\n`);
      } else if (elementType === 'transition') {
        contentLines.push(
          `\n                                                  ${para.text}\n`
        );
      } else {
        contentLines.push(`\n${para.text}\n`);
      }

      if (currentScene) {
        currentScene.elements.push(element);
      }

      prevType = elementType;
    }

    if (currentScene) {
      scenes.push(currentScene);
    }

    if (scenes.length === 0) {
      warnings.push({
        message: 'No scene headings detected - ensure scene headings start with INT./EXT.',
        severity: 'warning',
      });
    }

    return { scenes, elements, titlePage, contentLines };
  }

  private detectElementType(
    para: DocxParagraph,
    prevType: SceneElement['type']
  ): SceneElement['type'] {
    const text = para.text;

    // 1. Style-based detection (most reliable when available)
    if (para.styleName) {
      const mappedType = STYLE_MAPPINGS[para.styleName];
      if (mappedType) {
        return mappedType;
      }
    }

    // 2. Scene heading - clear regex patterns
    for (const pattern of SCENE_HEADING_PATTERNS) {
      if (pattern.test(text)) {
        return 'scene-heading';
      }
    }

    // 3. Transition patterns
    for (const pattern of TRANSITION_PATTERNS) {
      if (pattern.test(text)) {
        return 'transition';
      }
    }

    // 4. Parenthetical - wrapped in parens
    if (text.startsWith('(') && text.endsWith(')')) {
      return 'parenthetical';
    }

    const indent = para.indentLeft || 0;

    // 5. Character detection with multiple strategies
    const isCharacter = this.detectCharacter(para, prevType, indent, text);
    if (isCharacter) {
      return 'character';
    }

    // 6. Dialogue detection - follows character/parenthetical/dialogue
    const isDialogue = this.detectDialogue(para, prevType, indent, text);
    if (isDialogue) {
      return 'dialogue';
    }

    // 7. Transition fallback - right-aligned ALL CAPS
    if (
      (para.alignment === 'right' || indent >= INDENT_THRESHOLDS.transition.min) &&
      para.isAllCaps
    ) {
      return 'transition';
    }

    return 'action';
  }

  /**
   * Multi-strategy character detection
   */
  private detectCharacter(
    para: DocxParagraph,
    prevType: SceneElement['type'],
    indent: number,
    text: string
  ): boolean {
    // Must contain at least one letter (filters out "112", "2024", etc.)
    if (!HAS_LETTER.test(text)) {
      return false;
    }

    // Must be short (character names aren't long)
    if (text.length > 40) {
      return false;
    }

    // Must be ALL CAPS for character names
    if (!para.isAllCaps) {
      return false;
    }

    // Filter out lines that look like action (sentences, common action starters)
    for (const pattern of ACTION_INDICATORS) {
      if (pattern.test(text)) {
        return false;
      }
    }

    // Extract base name without parenthetical (V.O., O.S., CONT'D, etc.)
    const baseName = text.replace(/\s*\([^)]+\)\s*$/, '').trim();

    // Base name must be at least 2 characters and contain letters
    if (baseName.length < 2 || !HAS_LETTER.test(baseName)) {
      return false;
    }

    // Strategy 1: Style/indentation-based (traditional approach)
    const hasCharacterIndent = indent >= INDENT_THRESHOLDS.character.min &&
      indent <= INDENT_THRESHOLDS.character.max;
    const isCentered = para.alignment === 'center';

    if (hasCharacterIndent || isCentered) {
      // Even with proper formatting, validate it looks like a name
      const wordCount = baseName.split(/\s+/).length;
      if (wordCount <= 4 && CHARACTER_NAME_PATTERN.test(text)) {
        return true;
      }
      // Single word ALL CAPS with proper indent is likely a character
      if (wordCount === 1 && baseName.length >= 2 && baseName.length <= 20) {
        return true;
      }
    }

    // Strategy 2: Pattern matching for character names
    // Must match character name pattern AND be reasonably short
    if (CHARACTER_NAME_PATTERN.test(text)) {
      const wordCount = baseName.split(/\s+/).length;
      // Character names are typically 1-3 words
      if (wordCount <= 3 && baseName.length <= 25) {
        return true;
      }
    }

    // Strategy 3: Context-based - single/double word ALL CAPS after action
    // This is more restrictive - only triggers for very name-like text
    if (
      (prevType === 'action' || prevType === 'scene-heading') &&
      baseName.length >= 2 &&
      baseName.length <= 20
    ) {
      const wordCount = baseName.split(/\s+/).length;
      // Only 1-2 word names without any punctuation (including hyphens at word end)
      // Hyphens in the middle of names are OK (e.g., MARY-ANNE), but trailing hyphens indicate
      // interrupted speech or stylized action (e.g., "ONCE-", "TWICE-")
      const hasTrailingHyphen = /-$/.test(baseName);
      if (wordCount <= 2 && !/[.!?,;:]/.test(baseName) && !hasTrailingHyphen) {
        // Make sure it's not a common word that might be emphasized
        const commonWords = ['LATER', 'CONTINUOUS', 'MEANWHILE', 'SUDDENLY', 'FINALLY', 'THEN', 'NOW', 'HERE', 'THERE'];
        if (!commonWords.includes(baseName)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Multi-strategy dialogue detection
   */
  private detectDialogue(
    para: DocxParagraph,
    prevType: SceneElement['type'],
    indent: number,
    text: string
  ): boolean {
    // Dialogue must follow character, parenthetical, or continuing dialogue
    const followsDialogueContext =
      prevType === 'character' ||
      prevType === 'parenthetical' ||
      prevType === 'dialogue';

    if (!followsDialogueContext) {
      return false;
    }

    // Dialogue is NOT all caps (that would be a character or action)
    // Exception: occasional emphasized dialogue, but usually mixed case
    if (para.isAllCaps && text.length > 20) {
      return false;
    }

    // Strategy 1: Indentation-based (lenient thresholds)
    if (indent >= INDENT_THRESHOLDS.dialogue.min &&
        indent <= INDENT_THRESHOLDS.dialogue.max) {
      return true;
    }

    // Strategy 2: Context-based fallback
    // If previous was character/parenthetical and this is not a scene heading,
    // transition, or another character, it's likely dialogue
    if (prevType === 'character' || prevType === 'parenthetical') {
      // Not ALL CAPS (not another character), not a scene heading, not a transition
      if (!para.isAllCaps) {
        return true;
      }
    }

    // Strategy 3: Continuation - if previous was dialogue and no major formatting change
    if (prevType === 'dialogue' && !para.isAllCaps) {
      return true;
    }

    return false;
  }

  /**
   * Extract title page information from paragraphs.
   *
   * Strategy: Look for "Written by" pattern first, then find title above it.
   * Returns 0 to preserve all content - title page extraction is metadata only,
   * pre-scene content (action, transitions) should still be included in screenplay.
   */
  private extractTitlePage(
    paragraphs: DocxParagraph[],
    titlePage: TitlePage
  ): number {
    let writtenByIndex = -1;
    let lastTitlePageElement = -1;

    // First pass: find title page elements and key patterns
    for (let i = 0; i < Math.min(paragraphs.length, 20); i++) {
      const para = paragraphs[i];
      const text = para.text;

      // Scene heading marks definite end of title page area
      if (this.isSceneHeading(text)) {
        break;
      }

      // Check for explicit Fountain-style "Title:" pattern
      if (/^title:\s*/i.test(text)) {
        titlePage.title = text.replace(/^title:\s*/i, '').trim();
        lastTitlePageElement = i;
      } else if (/^(written by|by)\s*$/i.test(text)) {
        // "Written by" on its own line - author is on next line
        writtenByIndex = i;
        titlePage.credit = text;
        lastTitlePageElement = i;
        if (paragraphs[i + 1] && !this.isSceneHeading(paragraphs[i + 1].text)) {
          titlePage.author = paragraphs[i + 1].text;
          lastTitlePageElement = i + 1;
        }
      } else if (/^(written by|screenplay by|by)\s+(.+)/i.test(text)) {
        // "Written by Name" on same line
        writtenByIndex = i;
        titlePage.credit = text;
        const match = text.match(/^(written by|screenplay by|by)\s+(.+)/i);
        if (match) {
          titlePage.author = match[2].trim();
        }
        lastTitlePageElement = i;
      } else if (/^author:\s*/i.test(text)) {
        writtenByIndex = i;
        titlePage.author = text.replace(/^author:\s*/i, '').trim();
        lastTitlePageElement = i;
      } else if (/^logline:\s*/i.test(text)) {
        titlePage.logline = text.replace(/^logline:\s*/i, '').trim();
        lastTitlePageElement = i;
      } else if (/^draft|revision/i.test(text)) {
        titlePage.draftDate = text;
        lastTitlePageElement = i;
      } else if (/^©|copyright/i.test(text)) {
        titlePage.copyright = text;
        lastTitlePageElement = i;
      }
    }

    // Second pass: find title if not already found
    if (!titlePage.title) {
      if (writtenByIndex > 0) {
        // Look for title right before "Written by"
        this.findTitleBeforeWrittenBy(paragraphs, writtenByIndex, titlePage);
      } else if (lastTitlePageElement === -1) {
        // No title page elements found - check first few centered lines
        for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
          const para = paragraphs[i];
          const text = para.text;

          if (this.isSceneHeading(text)) break;

          // Only centered text for title when no other title page elements exist
          if (para.alignment === 'center') {
            const isPreSceneAction = /^(FADE\s*(IN|OUT|TO)?:?|CUT\s*TO:?|DISSOLVE:?|BLACK\.?|WHITE\.?|DARKNESS\.?|SILENCE\.?|BLACKNESS\.?|BLANK\s*SCREEN\.?|OVER\s*BLACK\.?|SUPER:?|SUPERIMPOSE:?)$/i.test(text);
            const isDraft = /^(draft|revision|version|\d{4}|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text);

            if (!isPreSceneAction && !isDraft && !text.includes(':')) {
              titlePage.title = text;
              break;
            }
          }
        }
      }
    }

    // Return 0 to include all content - pre-scene action/transitions should be preserved
    // Title page elements were extracted as metadata but the content loop should
    // still process everything and detect element types properly
    return 0;
  }

  /**
   * Find title by looking backwards from "Written by" line.
   */
  private findTitleBeforeWrittenBy(
    paragraphs: DocxParagraph[],
    writtenByIndex: number,
    titlePage: TitlePage
  ): void {
    for (let i = writtenByIndex - 1; i >= 0; i--) {
      const text = paragraphs[i].text;
      if (!text.trim()) continue;

      // Skip lines that are clearly not titles
      const isSceneHeading = /^(INT|EXT|INT\.?\/?EXT|I\.?\/?E)\b/i.test(text);
      const isDraft = /^(draft|revision|version|\d{4}|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text);

      if (!isSceneHeading && !isDraft && !text.includes(':')) {
        // This is likely the title (first non-empty line above "Written by")
        titlePage.title = text;
        break;
      }
    }
  }

  private isSceneHeading(text: string): boolean {
    for (const pattern of SCENE_HEADING_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Try to split merged character+dialogue text.
   * Returns null if text doesn't look like merged character+dialogue.
   * Handles cases like:
   * - "OPERATOR (V.O.)Hallo?" → { character: "OPERATOR (V.O.)", dialogue: "Hallo?" }
   * - "POLICE (O.S.)(muffled)Polizei!" → { character: "POLICE (O.S.)(muffled)", dialogue: "Polizei!" }
   * - "JOHNHello there" → { character: "JOHN", dialogue: "Hello there" }
   */
  private trySplitMergedCharacterDialogue(
    text: string
  ): { character: string; dialogue: string } | null {
    // Must have mixed case (character is uppercase, dialogue has lowercase)
    if (text === text.toUpperCase()) {
      return null;
    }

    // Pattern to match character name with 0, 1, or 2 parentheticals
    // Examples: "NAME", "NAME (V.O.)", "NAME (O.S.)(muffled)", "NAME (V.O.) (CONT'D)"
    // The key is that parentheticals are followed by dialogue that starts with a letter
    const multiExtPattern = /^([A-Z][A-Z\s'.,-]*(?:\s*\([^)]+\)){0,2})([A-Za-z].*)$/;
    const match = text.match(multiExtPattern);

    if (match) {
      const character = match[1].trim();
      const dialogue = match[2].trim();

      // Validate character part
      if (character.length < 2 || character.length > 50 || dialogue.length === 0) {
        return null;
      }

      // Extract base name (without parentheticals) for validation
      const baseName = character.replace(/\s*\([^)]+\)/g, '').trim();
      const baseWordCount = baseName.split(/\s+/).length;

      // Base name must be short (1-3 words) and look like a character name
      if (baseWordCount > 3 || baseName.length > 25) {
        return null;
      }

      // Filter out action-like text
      if (ACTION_INDICATORS.some(p => p.test(baseName))) {
        return null;
      }

      // If character has parentheticals, it's likely a real character
      const hasParenthetical = /\([^)]+\)/.test(character);
      if (hasParenthetical) {
        return { character, dialogue };
      }

      // Without parentheticals, be more strict - base name must be very short
      if (baseWordCount <= 2 && baseName.length <= 15) {
        return { character, dialogue };
      }
    }

    return null;
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
    return 'INT';
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
    return 'DAY';
  }
}

const docxParser = new DocxParser();
registerParser(docxParser);

export { docxParser, DocxParser };
