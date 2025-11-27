/**
 * FDX Parser
 *
 * Parses Final Draft XML (.fdx) files into screenplay elements.
 * Final Draft is the industry standard screenwriting software.
 */

import { Scene, SceneElement } from '@/types/screenplay';

// Alias for clarity
type ScreenplayElement = SceneElement;

export interface FDXTitlePage {
  title?: string;
  author?: string;
  contact?: string;
  copyright?: string;
  draftDate?: string;
  [key: string]: string | undefined;
}

export interface FDXParseResult {
  titlePage: FDXTitlePage;
  content: string;
  scenes: Scene[];
  elements: ScreenplayElement[];
  rawXml: string;
}

// FDX paragraph types mapping
const PARAGRAPH_TYPES: Record<string, ScreenplayElement['type']> = {
  'Scene Heading': 'scene-heading',
  'Action': 'action',
  'Character': 'character',
  'Dialogue': 'dialogue',
  'Parenthetical': 'parenthetical',
  'Transition': 'transition',
  'Shot': 'action',
  'General': 'action',
  'Cast List': 'action',
  'Centered': 'action',
};

/**
 * Parse an FDX (Final Draft XML) document into structured data
 */
export function parseFDX(fdxContent: string): FDXParseResult {
  const titlePage: FDXTitlePage = {};
  const elements: ScreenplayElement[] = [];
  const scenes: Scene[] = [];
  const contentLines: string[] = [];

  let currentScene: Scene | null = null;
  let sceneNumber = 0;
  let elementId = 0;

  try {
    // Parse XML using DOMParser (available in browser)
    const parser = new DOMParser();
    const doc = parser.parseFromString(fdxContent, 'application/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML parse error: ${parseError.textContent}`);
    }

    // Parse title page
    const titlePageEl = doc.querySelector('TitlePage');
    if (titlePageEl) {
      const titleParagraphs = titlePageEl.querySelectorAll('Paragraph');
      titleParagraphs.forEach(p => {
        const type = p.getAttribute('Type')?.toLowerCase();
        const text = getTextContent(p);

        if (type === 'title' && text) {
          titlePage.title = text;
        } else if (type === 'authors' || type === 'author') {
          if (text && text.toLowerCase() !== 'by') {
            titlePage.author = text;
          }
        } else if (type === 'contact' && text) {
          titlePage.contact = text;
        } else if (type === 'copyright' && text) {
          titlePage.copyright = text;
        }
      });
    }

    // Parse content paragraphs
    const contentEl = doc.querySelector('Content');
    if (contentEl) {
      const paragraphs = contentEl.querySelectorAll(':scope > Paragraph');

      paragraphs.forEach(p => {
        const fdxType = p.getAttribute('Type') || 'Action';
        const elementType = PARAGRAPH_TYPES[fdxType] || 'action';
        const sceneNum = p.getAttribute('Number');
        const text = getTextContent(p);

        if (!text) return;

        // Create element
        const element: ScreenplayElement = {
          id: `elem-${++elementId}`,
          type: elementType,
          content: text,
        };

        // Handle scene headings
        if (elementType === 'scene-heading') {
          // Save previous scene
          if (currentScene) {
            scenes.push(currentScene);
          }

          sceneNumber++;
          const locationName = extractLocation(text);
          currentScene = {
            id: `scene-${sceneNumber}`,
            number: sceneNum ? parseInt(sceneNum) : sceneNumber,
            heading: text,
            location: {
              id: `loc-${sceneNumber}`,
              name: locationName,
              type: extractLocationType(text),
              color: '#888888',
            },
            timeOfDay: extractTimeOfDay(text),
            characters: [],
            elements: [],
            synopsis: '',
          };

          contentLines.push(`\n${text}\n`);
        }
        // Handle character names
        else if (elementType === 'character') {
          if (currentScene) {
            const baseName = text.replace(/\s*\([^)]+\)\s*$/, '').trim();
            if (!currentScene.characters.includes(baseName)) {
              currentScene.characters.push(baseName);
            }
          }
          contentLines.push(`\n                              ${text}\n`);
        }
        // Handle dialogue
        else if (elementType === 'dialogue') {
          contentLines.push(`                    ${text}\n`);
        }
        // Handle parenthetical
        else if (elementType === 'parenthetical') {
          contentLines.push(`                         ${text}\n`);
        }
        // Handle transitions
        else if (elementType === 'transition') {
          contentLines.push(`\n                                                          ${text}\n`);
        }
        // Handle action and other types
        else {
          contentLines.push(`\n${text}\n`);
        }

        elements.push(element);
        if (currentScene) {
          currentScene.elements.push(element);
        }
      });
    }

    // Save final scene
    if (currentScene) {
      scenes.push(currentScene);
    }

  } catch (error) {
    console.error('Error parsing FDX:', error);
    // Return partial result with error info
    return {
      titlePage,
      content: `Error parsing FDX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      scenes: [],
      elements: [],
      rawXml: fdxContent,
    };
  }

  return {
    titlePage,
    content: contentLines.join(''),
    scenes,
    elements,
    rawXml: fdxContent,
  };
}

/**
 * Get text content from an FDX paragraph element, handling Text children
 */
function getTextContent(paragraph: Element): string {
  const textElements = paragraph.querySelectorAll('Text');
  if (textElements.length === 0) {
    return paragraph.textContent?.trim() || '';
  }

  const parts: string[] = [];
  textElements.forEach(textEl => {
    const content = textEl.textContent || '';
    const style = textEl.getAttribute('Style');

    // Apply formatting based on style
    if (style) {
      if (style.includes('Bold') && style.includes('Italic')) {
        parts.push(`***${content}***`);
      } else if (style.includes('Bold')) {
        parts.push(`**${content}**`);
      } else if (style.includes('Italic')) {
        parts.push(`*${content}*`);
      } else if (style.includes('Underline')) {
        parts.push(`_${content}_`);
      } else {
        parts.push(content);
      }
    } else {
      parts.push(content);
    }
  });

  return parts.join('').trim();
}

/**
 * Extract location name from scene heading
 */
function extractLocation(heading: string): string {
  const withoutPrefix = heading.replace(/^(INT|EXT|INT\.?\/EXT|I\.?\/E|EST)[\.\s]+/i, '');
  const withoutTime = withoutPrefix.replace(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER).*$/i, '');
  return withoutTime.trim();
}

/**
 * Extract location type from scene heading
 */
function extractLocationType(heading: string): 'INT' | 'EXT' | 'INT/EXT' {
  if (/^INT\.?\/EXT|^I\.?\/E/i.test(heading)) return 'INT/EXT';
  if (/^INT/i.test(heading)) return 'INT';
  if (/^EXT|^EST/i.test(heading)) return 'EXT';
  return 'INT';
}

/**
 * Extract time of day from scene heading
 */
function extractTimeOfDay(heading: string): 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' {
  const match = heading.match(/\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|AFTERNOON|EVENING|CONTINUOUS|LATER|SAME|MOMENTS LATER.*)$/i);
  if (!match) return 'DAY';

  const timeStr = match[1].toUpperCase();
  if (timeStr === 'NIGHT') return 'NIGHT';
  if (timeStr === 'DAWN' || timeStr === 'MORNING') return 'DAWN';
  if (timeStr === 'DUSK' || timeStr === 'EVENING' || timeStr === 'AFTERNOON') return 'DUSK';
  if (timeStr === 'CONTINUOUS' || timeStr === 'LATER' || timeStr === 'SAME' || timeStr.includes('LATER')) return 'CONTINUOUS';
  return 'DAY';
}

/**
 * Convert screenplay data to FDX format
 */
export function toFDX(
  title: string,
  author: string,
  scenes: Scene[]
): string {
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <TitlePage>
      <Content>
        <Paragraph Type="Title">
          <Text>${escapeXml(title)}</Text>
        </Paragraph>
        <Paragraph Type="Authors">
          <Text>by</Text>
        </Paragraph>
        <Paragraph Type="Authors">
          <Text>${escapeXml(author)}</Text>
        </Paragraph>
      </Content>
    </TitlePage>
`;

  scenes.forEach((scene, index) => {
    const sceneNum = scene.number || index + 1;

    // Scene heading
    xml += `    <Paragraph Type="Scene Heading" Number="${sceneNum}">
      <Text>${escapeXml(scene.heading)}</Text>
    </Paragraph>\n`;

    // Scene elements
    scene.elements.forEach(element => {
      const fdxType = getFDXType(element.type);
      xml += `    <Paragraph Type="${fdxType}">
      <Text>${escapeXml(element.content)}</Text>
    </Paragraph>\n`;
    });
  });

  xml += `  </Content>
</FinalDraft>`;

  return xml;
}

/**
 * Get FDX paragraph type from element type
 */
function getFDXType(elementType: ScreenplayElement['type']): string {
  switch (elementType) {
    case 'scene-heading': return 'Scene Heading';
    case 'action': return 'Action';
    case 'character': return 'Character';
    case 'dialogue': return 'Dialogue';
    case 'parenthetical': return 'Parenthetical';
    case 'transition': return 'Transition';
    default: return 'Action';
  }
}

/**
 * Validate if content looks like FDX format
 */
export function isFDXFormat(content: string): boolean {
  // Check for FDX XML markers
  return content.includes('<FinalDraft') && content.includes('</FinalDraft>');
}

/**
 * Parse FDX from a File object
 */
export async function parseFDXFile(file: File): Promise<FDXParseResult> {
  const text = await file.text();
  return parseFDX(text);
}
