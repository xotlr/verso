'use client';

import { useCallback, RefObject } from 'react';

interface UseTextFormattingOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onChange: (text: string) => void;
}

interface UseTextFormattingReturn {
  // Wrap selection with markers (bold, italic, underline)
  wrapSelection: (before: string, after: string) => void;

  // Insert text at cursor
  insertAtCursor: (insertText: string) => void;

  // Quick inserts
  insertSceneHeading: () => void;
  insertCharacter: () => void;
  insertDialogue: () => void;
  insertAction: () => void;
  insertTransition: () => void;
  insertParenthetical: () => void;
  insertDualDialogue: () => void;

  // Case transforms
  convertToUpperCase: () => void;
  convertToLowerCase: () => void;

  // Character extensions
  addContd: () => void;
  addExtension: (extension: string) => void;
}

export function useTextFormatting({
  textareaRef,
  text,
  onChange,
}: UseTextFormattingOptions): UseTextFormattingReturn {
  const wrapSelection = useCallback((before: string, after: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = text.substring(start, end);

    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    onChange(newText);

    // Restore selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + before.length;
        textareaRef.current.selectionEnd = end + before.length;
        textareaRef.current.focus();
      }
    }, 0);
  }, [textareaRef, text, onChange]);

  const insertAtCursor = useCallback((insertText: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    const newText = text.substring(0, start) + insertText + text.substring(end);
    onChange(newText);

    // Move cursor after inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + insertText.length;
        textareaRef.current.selectionEnd = start + insertText.length;
        textareaRef.current.focus();
      }
    }, 0);
  }, [textareaRef, text, onChange]);

  const insertSceneHeading = useCallback(() => {
    insertAtCursor('\n\nINT. LOCATION - TIME\n\n');
  }, [insertAtCursor]);

  const insertCharacter = useCallback(() => {
    const characterName = '                              CHARACTER NAME';
    insertAtCursor('\n' + characterName + '\n');
  }, [insertAtCursor]);

  const insertDialogue = useCallback(() => {
    insertAtCursor('                         Dialogue goes here.\n');
  }, [insertAtCursor]);

  const insertAction = useCallback(() => {
    insertAtCursor('\nAction description here.\n\n');
  }, [insertAtCursor]);

  const insertTransition = useCallback(() => {
    insertAtCursor('\n                                                          CUT TO:\n\n');
  }, [insertAtCursor]);

  const insertParenthetical = useCallback(() => {
    insertAtCursor('                         (parenthetical)\n');
  }, [insertAtCursor]);

  const insertDualDialogue = useCallback(() => {
    const dualDialogueTemplate = `
                              CHARACTER ONE
                    First character's dialogue here.

                              CHARACTER TWO ^
                    Second character's dialogue here
                    (speaks simultaneously).

`;
    insertAtCursor(dualDialogueTemplate);
  }, [insertAtCursor]);

  const convertToUpperCase = useCallback(() => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    if (start === end) return; // No selection

    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + selectedText.toUpperCase() + text.substring(end);
    onChange(newText);
  }, [textareaRef, text, onChange]);

  const convertToLowerCase = useCallback(() => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    if (start === end) return; // No selection

    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + selectedText.toLowerCase() + text.substring(end);
    onChange(newText);
  }, [textareaRef, text, onChange]);

  const addContd = useCallback(() => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const lines = text.substring(0, cursorPos).split('\n');
    const currentLineIndex = lines.length - 1;

    // Find the nearest character name above
    for (let i = currentLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === line.toUpperCase() && line.length > 0 && !line.includes('.')) {
        // This is likely a character name
        const newLine = line + " (CONT'D)";
        lines[i] = lines[i].replace(line, newLine);
        const newText = lines.join('\n') + text.substring(cursorPos);
        onChange(newText);
        break;
      }
    }
  }, [textareaRef, text, onChange]);

  const addExtension = useCallback((extension: string) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const lines = text.substring(0, cursorPos).split('\n');
    const currentLineIndex = lines.length - 1;

    // Find the nearest character name above
    for (let i = currentLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === line.toUpperCase() && line.length > 0 && !line.includes('.')) {
        // This is likely a character name
        const newLine = line + ` (${extension})`;
        lines[i] = lines[i].replace(line, newLine);
        const newText = lines.join('\n') + text.substring(cursorPos);
        onChange(newText);
        break;
      }
    }
  }, [textareaRef, text, onChange]);

  return {
    wrapSelection,
    insertAtCursor,
    insertSceneHeading,
    insertCharacter,
    insertDialogue,
    insertAction,
    insertTransition,
    insertParenthetical,
    insertDualDialogue,
    convertToUpperCase,
    convertToLowerCase,
    addContd,
    addExtension,
  };
}
