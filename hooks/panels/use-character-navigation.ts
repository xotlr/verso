import { useCallback } from 'react';
import { toast } from 'sonner';
import { TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

interface UseCharacterNavigationOptions {
  view: EditorView | null | undefined;
}

/**
 * Hook providing navigation actions for characters in the editor.
 * Extracted from CharactersPanel for reusability and cleaner separation.
 */
export function useCharacterNavigation({ view }: UseCharacterNavigationOptions) {
  /**
   * Navigate to first appearance of character (any mention in script).
   */
  const goToFirstAppearance = useCallback((charName: string) => {
    if (!view) {
      toast.error('Editor not ready');
      return;
    }

    const { doc, tr } = view.state;
    let foundPos: number | null = null;
    const charNameUpper = charName.toUpperCase();

    // Search through all nodes for character name
    doc.descendants((node, pos) => {
      if (foundPos !== null) return false; // Stop if already found

      // Check character nodes (dialogue attribution)
      if (node.type.name === 'character') {
        const text = node.textContent.trim().toUpperCase();
        if (text === charNameUpper || text.startsWith(charNameUpper + ' (')) {
          foundPos = pos;
          return false;
        }
      }

      // Check action and other text nodes for mentions
      if (node.isText && node.text) {
        const text = node.text.toUpperCase();
        const idx = text.indexOf(charNameUpper);
        if (idx !== -1) {
          foundPos = pos + idx;
          return false;
        }
      }

      return true;
    });

    if (foundPos !== null) {
      const selection = TextSelection.create(doc, foundPos);
      view.dispatch(tr.setSelection(selection).scrollIntoView());
      view.focus();
      toast.success(`Jumped to ${charName}'s first appearance`);
    } else {
      toast.error(`${charName} not found in script`);
    }
  }, [view]);

  /**
   * Navigate to first dialogue line of character.
   */
  const goToFirstDialogue = useCallback((charName: string) => {
    if (!view) {
      toast.error('Editor not ready');
      return;
    }

    const { doc, tr } = view.state;
    let foundPos: number | null = null;
    const charNameUpper = charName.toUpperCase();

    // Search for character nodes followed by dialogue
    doc.descendants((node, pos) => {
      if (foundPos !== null) return false;

      if (node.type.name === 'character') {
        const text = node.textContent.trim().toUpperCase();
        if (text === charNameUpper || text.startsWith(charNameUpper + ' (')) {
          foundPos = pos;
          return false;
        }
      }

      return true;
    });

    if (foundPos !== null) {
      const selection = TextSelection.create(doc, foundPos);
      view.dispatch(tr.setSelection(selection).scrollIntoView());
      view.focus();
      toast.success(`Jumped to ${charName}'s first dialogue`);
    } else {
      toast.error(`${charName} has no dialogue`);
    }
  }, [view]);

  /**
   * Copy character name to clipboard.
   */
  const copyName = useCallback((charName: string) => {
    navigator.clipboard.writeText(charName);
    toast.success(`Copied "${charName}" to clipboard`);
  }, []);

  return {
    goToFirstAppearance,
    goToFirstDialogue,
    copyName,
  };
}
