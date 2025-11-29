/**
 * Serializer for converting ProseMirror documents to Verso pagination format
 */

import { Node as ProseMirrorNode } from 'prosemirror-model';
import type { Element, ElementType } from './types';

/**
 * Map ProseMirror node types to Verso element types
 */
const NODE_TYPE_MAP: Record<string, ElementType> = {
  scene_heading: 'scene_heading',
  action: 'action',
  character: 'character',
  dialogue: 'dialogue',
  parenthetical: 'parenthetical',
  transition: 'transition',
  shot: 'shot',
  dual_dialogue: 'dual_dialogue_left', // Container - will be handled specially
  dual_dialogue_column: 'dual_dialogue_left', // Will check position
};

/**
 * Convert a ProseMirror document to Verso Element array
 */
export function serializeDocument(doc: ProseMirrorNode): Element[] {
  const elements: Element[] = [];
  let elementIndex = 0;

  doc.forEach((node, offset) => {
    const converted = convertNode(node, elementIndex.toString());
    if (converted) {
      elements.push(...converted);
      elementIndex += converted.length;
    }
  });

  return elements;
}

/**
 * Convert a single ProseMirror node to Verso Element(s)
 */
function convertNode(node: ProseMirrorNode, id: string): Element[] | null {
  const nodeType = node.type.name;

  // Skip non-element nodes
  if (nodeType === 'doc' || nodeType === 'text') {
    return null;
  }

  // Handle dual dialogue specially
  if (nodeType === 'dual_dialogue') {
    return convertDualDialogue(node, id);
  }

  // Map node type to element type
  const elementType = NODE_TYPE_MAP[nodeType];
  if (!elementType) {
    // Default to action for unknown types
    return [{
      id,
      element_type: 'action',
      content: getTextContent(node),
    }];
  }

  // Extract text content
  const content = getTextContent(node);

  // Build the element
  const element: Element = {
    id,
    element_type: elementType,
    content,
  };

  // Add character name for dialogue/parenthetical
  if (elementType === 'dialogue' || elementType === 'parenthetical') {
    const characterName = findCharacterName(node);
    if (characterName) {
      element.character_name = characterName;
    }
  }

  return [element];
}

/**
 * Convert dual dialogue container to two separate element streams
 */
function convertDualDialogue(node: ProseMirrorNode, baseId: string): Element[] {
  const elements: Element[] = [];
  let columnIndex = 0;

  node.forEach((column) => {
    if (column.type.name === 'dual_dialogue_column') {
      const position = columnIndex === 0 ? 'left' : 'right';
      let elementIndex = 0;

      column.forEach((child) => {
        const childId = `${baseId}_${position}_${elementIndex}`;
        const converted = convertNode(child, childId);

        if (converted) {
          converted.forEach((el) => {
            el.dual_dialogue_position = position;
          });
          elements.push(...converted);
          elementIndex++;
        }
      });

      columnIndex++;
    }
  });

  return elements;
}

/**
 * Get plain text content from a node
 */
function getTextContent(node: ProseMirrorNode): string {
  let text = '';

  node.forEach((child) => {
    if (child.isText) {
      text += child.text || '';
    } else if (child.isBlock) {
      if (text.length > 0) {
        text += '\n';
      }
      text += getTextContent(child);
    }
  });

  return text;
}

/**
 * Find the character name for a dialogue or parenthetical node
 * by looking at the previous sibling
 */
function findCharacterName(node: ProseMirrorNode): string | null {
  // This would need access to the document context
  // For now, check if the node has a characterId attribute
  const attrs = node.attrs as { characterId?: string } | undefined;
  if (attrs?.characterId) {
    return attrs.characterId;
  }

  return null;
}

/**
 * Create a position map from element IDs to ProseMirror positions
 */
export interface PositionMap {
  elementToPos: Map<string, { from: number; to: number }>;
  posToElement: (pos: number) => string | null;
}

export function createPositionMap(doc: ProseMirrorNode): PositionMap {
  const elementToPos = new Map<string, { from: number; to: number }>();
  const posRanges: Array<{ from: number; to: number; id: string }> = [];

  let elementIndex = 0;

  doc.forEach((node, offset) => {
    const id = elementIndex.toString();
    const from = offset;
    const to = offset + node.nodeSize;

    elementToPos.set(id, { from, to });
    posRanges.push({ from, to, id });

    elementIndex++;
  });

  // Sort by position for binary search
  posRanges.sort((a, b) => a.from - b.from);

  const posToElement = (pos: number): string | null => {
    // Binary search for the element containing this position
    let left = 0;
    let right = posRanges.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const range = posRanges[mid];

      if (pos >= range.from && pos < range.to) {
        return range.id;
      } else if (pos < range.from) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;
  };

  return { elementToPos, posToElement };
}
