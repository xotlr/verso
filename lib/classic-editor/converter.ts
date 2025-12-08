/**
 * Converter between ProseMirror JSON format and Classic Editor ScriptBlock format
 */

import { ScriptBlock, BlockType, ScriptMetadata } from './types';

// ProseMirror node types -> Classic BlockType mapping
const PM_TO_BLOCK_TYPE: Record<string, BlockType> = {
  'scene_heading': BlockType.SCENE_HEADING,
  'action': BlockType.ACTION,
  'character': BlockType.CHARACTER,
  'dialogue': BlockType.DIALOGUE,
  'parenthetical': BlockType.PARENTHETICAL,
  'transition': BlockType.TRANSITION,
  'section': BlockType.SECTION,
  // Fallbacks
  'paragraph': BlockType.ACTION,
};

const BLOCK_TO_PM_TYPE: Record<BlockType, string> = {
  [BlockType.SCENE_HEADING]: 'scene_heading',
  [BlockType.ACTION]: 'action',
  [BlockType.CHARACTER]: 'character',
  [BlockType.DIALOGUE]: 'dialogue',
  [BlockType.PARENTHETICAL]: 'parenthetical',
  [BlockType.TRANSITION]: 'transition',
  [BlockType.SECTION]: 'section',
};

/**
 * Extract text content from ProseMirror node, preserving marks as HTML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextWithMarks(node: any): string {
  if (!node.content) return '';

  let result = '';
  for (const child of node.content) {
    if (child.type === 'text') {
      let text = child.text || '';
      // Apply marks (bold, italic, underline)
      if (child.marks) {
        for (const mark of child.marks) {
          if (mark.type === 'bold') {
            text = `<b>${text}</b>`;
          } else if (mark.type === 'italic') {
            text = `<i>${text}</i>`;
          } else if (mark.type === 'underline') {
            text = `<u>${text}</u>`;
          }
        }
      }
      result += text;
    }
  }
  return result;
}

/**
 * Convert ProseMirror JSON document to Classic Editor ScriptBlocks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function proseMirrorToBlocks(pmDoc: any): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];

  if (!pmDoc || !pmDoc.content) {
    return blocks;
  }

  for (const node of pmDoc.content) {
    const blockType = PM_TO_BLOCK_TYPE[node.type] || BlockType.ACTION;
    const content = extractTextWithMarks(node);

    blocks.push({
      id: node.attrs?.id || crypto.randomUUID(),
      type: blockType,
      content,
    });
  }

  return blocks;
}

/**
 * Convert plain text (fountain-like) to Classic Editor ScriptBlocks
 */
export function plainTextToBlocks(text: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Scene heading detection
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(line)) {
      blocks.push({
        id: crypto.randomUUID(),
        type: BlockType.SCENE_HEADING,
        content: line,
      });
      i++;
      continue;
    }

    // Transition detection (ends with TO:)
    if (/TO:$/i.test(line)) {
      blocks.push({
        id: crypto.randomUUID(),
        type: BlockType.TRANSITION,
        content: line,
      });
      i++;
      continue;
    }

    // Character detection (ALL CAPS, possibly followed by parenthetical)
    if (/^[A-Z][A-Z\s\d]*(\s*\(.*\))?$/.test(line) && line.length < 40) {
      blocks.push({
        id: crypto.randomUUID(),
        type: BlockType.CHARACTER,
        content: line,
      });
      i++;

      // Check for parenthetical
      if (i < lines.length && lines[i].trim().startsWith('(')) {
        blocks.push({
          id: crypto.randomUUID(),
          type: BlockType.PARENTHETICAL,
          content: lines[i].trim(),
        });
        i++;
      }

      // Check for dialogue
      if (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('(')) {
        const dialogueLines: string[] = [];
        while (i < lines.length && lines[i].trim() && !/^[A-Z][A-Z\s\d]*(\s*\(.*\))?$/.test(lines[i].trim())) {
          if (lines[i].trim().startsWith('(')) {
            // Embedded parenthetical
            if (dialogueLines.length > 0) {
              blocks.push({
                id: crypto.randomUUID(),
                type: BlockType.DIALOGUE,
                content: dialogueLines.join(' '),
              });
              dialogueLines.length = 0;
            }
            blocks.push({
              id: crypto.randomUUID(),
              type: BlockType.PARENTHETICAL,
              content: lines[i].trim(),
            });
          } else {
            dialogueLines.push(lines[i].trim());
          }
          i++;
        }
        if (dialogueLines.length > 0) {
          blocks.push({
            id: crypto.randomUUID(),
            type: BlockType.DIALOGUE,
            content: dialogueLines.join(' '),
          });
        }
      }
      continue;
    }

    // Section/Act detection
    if (/^(ACT\s|PROLOGUE|EPILOGUE)/i.test(line)) {
      blocks.push({
        id: crypto.randomUUID(),
        type: BlockType.SECTION,
        content: line,
      });
      i++;
      continue;
    }

    // Default to action
    blocks.push({
      id: crypto.randomUUID(),
      type: BlockType.ACTION,
      content: line,
    });
    i++;
  }

  return blocks;
}

/**
 * Convert Classic Editor ScriptBlocks to ProseMirror JSON document
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function blocksToProseMirror(blocks: ScriptBlock[]): any {
  const content = blocks.map(block => {
    const pmType = BLOCK_TO_PM_TYPE[block.type] || 'action';

    // Parse HTML content back to marks
    const textContent = parseHtmlToMarkedText(block.content);

    return {
      type: pmType,
      attrs: { id: block.id },
      content: textContent.length > 0 ? textContent : undefined,
    };
  });

  return {
    type: 'doc',
    content,
  };
}

/**
 * Parse HTML content (with <b>, <i>, <u>) to ProseMirror text nodes with marks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseHtmlToMarkedText(html: string): any[] {
  if (!html) return [];

  // Very basic implementation - for complex HTML, use a proper parser
  const cleanText = html.replace(/<[^>]+>/g, '');
  if (!cleanText) return [];

  // For now, just return plain text without marks
  // A full implementation would parse the HTML properly
  return [{
    type: 'text',
    text: cleanText,
  }];
}

/**
 * Convert Classic Editor ScriptBlocks to plain text (for saving)
 */
export function blocksToPlainText(blocks: ScriptBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    // Strip HTML tags for plain text
    const text = block.content.replace(/<[^>]+>/g, '');

    switch (block.type) {
      case BlockType.SCENE_HEADING:
        lines.push('');
        lines.push(text.toUpperCase());
        break;
      case BlockType.ACTION:
        lines.push('');
        lines.push(text);
        break;
      case BlockType.CHARACTER:
        lines.push('');
        lines.push(text.toUpperCase());
        break;
      case BlockType.DIALOGUE:
        lines.push(text);
        break;
      case BlockType.PARENTHETICAL:
        lines.push(text);
        break;
      case BlockType.TRANSITION:
        lines.push('');
        lines.push(text.toUpperCase());
        break;
      case BlockType.SECTION:
        lines.push('');
        lines.push('');
        lines.push(text.toUpperCase());
        break;
    }
  }

  return lines.join('\n').trim();
}

/**
 * Create default metadata from blocks
 */
export function createMetadataFromBlocks(blocks: ScriptBlock[], existingMeta?: Partial<ScriptMetadata>): ScriptMetadata {
  // Extract characters from CHARACTER blocks
  const characters: Record<string, { name: string; description: string; role: 'PROTAGONIST' | 'ANTAGONIST' | 'SUPPORTING' | 'MINOR' }> = {};

  for (const block of blocks) {
    if (block.type === BlockType.CHARACTER) {
      const name = block.content.replace(/<[^>]+>/g, '').split('(')[0].trim();
      if (name && !characters[name]) {
        characters[name] = {
          name,
          description: '',
          role: 'SUPPORTING',
        };
      }
    }
  }

  return {
    titlePage: existingMeta?.titlePage || {
      title: 'Untitled',
      author: '',
      contact: '',
      logline: '',
      date: new Date().toLocaleDateString(),
    },
    scenes: existingMeta?.scenes || {},
    characters: { ...characters, ...existingMeta?.characters },
  };
}
