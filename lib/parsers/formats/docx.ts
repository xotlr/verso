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
const CHARACTER_NAME_PATTERN = /^[A-Z][A-Z\s'.,-]+(?:\s*\([^)]+\))?$/;
// Matches: "JOHN", "JOHN SMITH", "DR. SMITH", "MARY JANE (V.O.)", "O'BRIEN"

// Lines that look like action even if ALL CAPS
const ACTION_INDICATORS = [
  /^(THE|A|AN|HE|SHE|THEY|WE|IT)\s/i,
  /\.\s*$/,  // Ends with period (likely a sentence)
  /,\s*$/,   // Ends with comma
  /\band\b/i, // Contains "and"
  /\bthe\b/i, // Contains "the"
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
        const paragraph = this.parseParagraph(p, styleMap);

        if (paragraph.text.trim()) {
          paragraphs.push(paragraph);
        }
      }
    } catch (error) {
      console.warn('Error parsing document.xml:', error);
    }

    return paragraphs;
  }

  private parseParagraph(
    p: Element,
    styleMap: Map<string, string>
  ): DocxParagraph {
    const textElements = p.getElementsByTagName('w:t');
    let text = '';
    for (let i = 0; i < textElements.length; i++) {
      text += textElements[i].textContent || '';
    }

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

    const rPr = p.getElementsByTagName('w:rPr')[0];
    const isBold = !!rPr?.getElementsByTagName('w:b')[0];
    const caps = rPr?.getElementsByTagName('w:caps')[0];
    const isAllCaps = !!caps || text === text.toUpperCase();

    return {
      text: text.trim(),
      styleName,
      indentLeft,
      alignment,
      isBold,
      isAllCaps,
    };
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
    // Must be short (character names aren't long)
    if (text.length > 45) {
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

    // Strategy 1: Style/indentation-based (traditional approach, now more lenient)
    const hasCharacterIndent = indent >= INDENT_THRESHOLDS.character.min &&
      indent <= INDENT_THRESHOLDS.character.max;
    const isCentered = para.alignment === 'center';

    if (hasCharacterIndent || isCentered) {
      return true;
    }

    // Strategy 2: Pattern matching for character names
    // Short ALL CAPS text that matches character name pattern
    if (CHARACTER_NAME_PATTERN.test(text) && text.length <= 35) {
      // Additional validation: no sentence-like characteristics
      const wordCount = text.split(/\s+/).length;
      if (wordCount <= 4) {
        return true;
      }
    }

    // Strategy 3: Context-based - ALL CAPS after action/scene-heading
    // Screenplay structure: scene heading -> action -> character -> dialogue
    if (
      (prevType === 'action' || prevType === 'scene-heading') &&
      text.length <= 30 &&
      !text.includes('.') &&
      !text.includes('!') &&
      !text.includes('?')
    ) {
      // Looks like a character cue: short ALL CAPS without punctuation after action
      const wordCount = text.split(/\s+/).length;
      if (wordCount <= 3) {
        return true;
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

  private extractTitlePage(
    paragraphs: DocxParagraph[],
    titlePage: TitlePage
  ): number {
    let titlePageEnd = 0;

    for (let i = 0; i < Math.min(paragraphs.length, 20); i++) {
      const para = paragraphs[i];
      const text = para.text;

      for (const pattern of SCENE_HEADING_PATTERNS) {
        if (pattern.test(text)) {
          return i;
        }
      }

      if (/^(written by|by|screenplay by)/i.test(text)) {
        titlePage.credit = text;
        titlePageEnd = i + 1;
        if (paragraphs[i + 1] && !this.isSceneHeading(paragraphs[i + 1].text)) {
          titlePage.author = paragraphs[i + 1].text;
          titlePageEnd = i + 2;
        }
      } else if (/^draft|revision/i.test(text)) {
        titlePage.draftDate = text;
        titlePageEnd = i + 1;
      } else if (/^©|copyright/i.test(text)) {
        titlePage.copyright = text;
        titlePageEnd = i + 1;
      } else if (!titlePage.title && i < 5 && para.alignment === 'center') {
        titlePage.title = text;
        titlePageEnd = i + 1;
      }
    }

    return titlePageEnd;
  }

  private isSceneHeading(text: string): boolean {
    for (const pattern of SCENE_HEADING_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
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
