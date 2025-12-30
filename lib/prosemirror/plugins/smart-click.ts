import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';
import { Node } from 'prosemirror-model';

export const smartClickPluginKey = new PluginKey('smartClick');

/**
 * Known placeholder patterns that should be selected entirely on click.
 * These are default/template text that users typically want to replace completely.
 */
const PLACEHOLDER_PATTERNS = [
  // Scene heading placeholders
  /^INT\.\s*(LOCATION|YOUR LOCATION|SCENE LOCATION)\s*-\s*(DAY|NIGHT|TIME)$/i,
  /^EXT\.\s*(LOCATION|YOUR LOCATION|SCENE LOCATION)\s*-\s*(DAY|NIGHT|TIME)$/i,
  /^INT\.\/EXT\.\s*(LOCATION|YOUR LOCATION|SCENE LOCATION)\s*-\s*(DAY|NIGHT|TIME)$/i,
  /^I\/E\.\s*(LOCATION|YOUR LOCATION|SCENE LOCATION)\s*-\s*(DAY|NIGHT|TIME)$/i,
  // Character placeholders
  /^CHARACTER(\s+NAME)?$/i,
  /^YOUR CHARACTER$/i,
  /^NAME$/i,
  // Transition placeholders
  /^CUT TO:$/i,
  /^FADE TO:$/i,
  /^DISSOLVE TO:$/i,
  // Shot placeholders
  /^SHOT$/i,
  /^WIDE SHOT$/i,
  /^CLOSE-?UP$/i,
  // Super/Chyron placeholders
  /^SUPER:$/i,
  /^CHYRON:$/i,
  // Other placeholders
  /^THE END$/i,
  /^FLASHBACK$/i,
  /^MONTAGE$/i,
  /^INTERCUT$/i,
  // Generic placeholder patterns
  /^(UNTITLED|TITLE)$/i,
  /^Written by\.{3}$/i,
];

/**
 * Check if text content matches a known placeholder pattern.
 */
function isPlaceholderText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Plugin that moves cursor to nearest editable line when clicking anywhere in the document.
 * This provides word-processor-like behavior where clicking margins or decorations
 * intelligently places the cursor in the nearest editable content.
 *
 * Also handles one-click selection of placeholder text for easy replacement.
 */
export function createSmartClickPlugin() {
  return new Plugin({
    key: smartClickPluginKey,

    props: {
      handleClick(view: EditorView, pos: number, _event: MouseEvent) {
        const { state } = view;
        const { doc } = state;

        // Get the clicked position's resolved node
        const $pos = doc.resolve(pos);

        // Check if we clicked on an editable textblock
        const isTextblock = $pos.parent.isTextblock;

        if (isTextblock) {
          // Check if the block contains placeholder text that should be fully selected
          const parentNode = $pos.parent;
          const textContent = parentNode.textContent;

          if (isPlaceholderText(textContent)) {
            // Select the entire placeholder text for easy replacement
            const start = $pos.before() + 1; // Start of text content
            const end = start + parentNode.content.size;

            const tr = state.tr.setSelection(
              TextSelection.create(doc, start, end)
            );
            view.dispatch(tr);
            return true; // Prevent default cursor placement
          }

          // Normal text, use default behavior
          return false;
        }

        // Find nearest editable block
        const nearestPos = findNearestEditableBlock(doc, pos);

        if (nearestPos !== null) {
          // Move cursor to start of nearest editable block
          const tr = state.tr.setSelection(
            TextSelection.near(doc.resolve(nearestPos))
          );
          view.dispatch(tr.scrollIntoView());
          view.focus();
          return true; // Prevent default
        }

        return false; // Use default behavior
      }
    }
  });
}

/**
 * Find the nearest editable block to a clicked position.
 * Walks through the document and calculates distance to each textblock.
 */
function findNearestEditableBlock(doc: Node, clickedPos: number): number | null {
  let nearestPos: number | null = null;
  let minDistance = Infinity;

  // Walk through all blocks in the document
  doc.forEach((node: Node, offset: number) => {
    if (node.isTextblock) {
      // Calculate distance from clicked position
      const blockStart = offset;
      const blockEnd = offset + node.nodeSize;

      let distance: number;
      if (clickedPos < blockStart) {
        // Clicked before this block
        distance = blockStart - clickedPos;
      } else if (clickedPos > blockEnd) {
        // Clicked after this block
        distance = clickedPos - blockEnd;
      } else {
        // Clicked inside this block (shouldn't happen, but handle it)
        distance = 0;
      }

      // Track nearest block
      if (distance < minDistance) {
        minDistance = distance;
        if (distance === 0) {
          // Clicked inside this block - preserve exact click position
          nearestPos = clickedPos;
        } else {
          // Clicked outside block - position cursor at start of block (+1 to be inside the node)
          nearestPos = blockStart + 1;
        }
      }
    }
  });

  return nearestPos;
}
