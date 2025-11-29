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
 * Convert a ProseMirror document to Verso Element array.
 * Uses document positions as element IDs for reliable mapping back.
 */
export function serializeDocument(doc: ProseMirrorNode): Element[] {
  const elements: Element[] = [];

  doc.forEach((node, offset) => {
    // Use document position as ID - this guarantees stable, unique IDs
    // that can be mapped back to document positions trivially
    const converted = convertNode(node, offset.toString(), offset);
    if (converted) {
      elements.push(...converted);
    }
  });

  return elements;
}

/**
 * Convert a single ProseMirror node to Verso Element(s)
 * @param node - The ProseMirror node
 * @param id - The element ID (based on document position)
 * @param baseOffset - The document offset for this node (used for dual dialogue children)
 */
function convertNode(node: ProseMirrorNode, id: string, baseOffset: number): Element[] | null {
  const nodeType = node.type.name;

  // Skip non-element nodes
  if (nodeType === 'doc' || nodeType === 'text') {
    return null;
  }

  // Handle dual dialogue specially
  if (nodeType === 'dual_dialogue') {
    return convertDualDialogue(node, id, baseOffset);
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
 * Convert dual dialogue container to two separate element streams.
 * Uses position-based IDs for child elements.
 */
function convertDualDialogue(node: ProseMirrorNode, baseId: string, baseOffset: number): Element[] {
  const elements: Element[] = [];
  let columnIndex = 0;
  let childOffset = 1; // Start after the dual_dialogue node opening

  node.forEach((column, columnNodeOffset) => {
    if (column.type.name === 'dual_dialogue_column') {
      const position = columnIndex === 0 ? 'left' : 'right';
      let innerOffset = 1; // Start after column node opening

      column.forEach((child, childNodeOffset) => {
        // Create ID using the absolute position within the dual dialogue
        const childId = `${baseId}_${childOffset + innerOffset}`;
        const converted = convertNode(child, childId, baseOffset + childOffset + innerOffset);

        if (converted) {
          converted.forEach((el) => {
            el.dual_dialogue_position = position;
          });
          elements.push(...converted);
        }
        innerOffset += child.nodeSize;
      });

      columnIndex++;
    }
    childOffset += column.nodeSize;
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
 * Create a position map from element IDs to ProseMirror positions.
 * Uses document positions as IDs to match serializeDocument().
 */
export interface PositionMap {
  elementToPos: Map<string, { from: number; to: number }>;
  posToElement: (pos: number) => string | null;
}

export function createPositionMap(doc: ProseMirrorNode): PositionMap {
  const elementToPos = new Map<string, { from: number; to: number }>();
  const posRanges: Array<{ from: number; to: number; id: string }> = [];

  doc.forEach((node, offset) => {
    // Use position as ID - matches serializeDocument()
    const id = offset.toString();
    const from = offset;
    const to = offset + node.nodeSize;

    elementToPos.set(id, { from, to });
    posRanges.push({ from, to, id });

    // For dual dialogue, also map child positions
    if (node.type.name === 'dual_dialogue') {
      let childOffset = 1; // Start after the dual_dialogue node opening
      node.forEach((column) => {
        if (column.type.name === 'dual_dialogue_column') {
          let innerOffset = 1; // Start after column node opening
          column.forEach((child) => {
            const childId = `${id}_${childOffset + innerOffset}`;
            const childFrom = offset + childOffset + innerOffset;
            const childTo = childFrom + child.nodeSize;
            elementToPos.set(childId, { from: childFrom, to: childTo });
            posRanges.push({ from: childFrom, to: childTo, id: childId });
            innerOffset += child.nodeSize;
          });
        }
        childOffset += column.nodeSize;
      });
    }
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
