'use client';

import { useState, useCallback, useEffect, RefObject } from 'react';

interface SearchResult {
  index: number;
  length: number;
  context: string;
}

interface UseEditorSearchOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onChange: (text: string) => void;
}

interface UseEditorSearchReturn {
  // Search state
  findText: string;
  setFindText: (text: string) => void;
  replaceText: string;
  setReplaceText: (text: string) => void;
  useRegex: boolean;
  setUseRegex: (value: boolean) => void;

  // Filter state
  searchByCharacter: string;
  setSearchByCharacter: (char: string) => void;
  searchByScene: string;
  setSearchByScene: (scene: string) => void;
  searchByElementType: string;
  setSearchByElementType: (type: string) => void;

  // Results
  searchResults: SearchResult[];
  currentSearchIndex: number;

  // Actions
  performSearch: () => void;
  handleFind: () => void;
  handleFindPrevious: () => void;
  handleReplace: () => void;
  handleReplaceAll: () => void;
  clearSearch: () => void;
}

export function useEditorSearch({
  textareaRef,
  text,
  onChange,
}: UseEditorSearchOptions): UseEditorSearchReturn {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [searchByCharacter, setSearchByCharacter] = useState('');
  const [searchByScene, setSearchByScene] = useState('');
  const [searchByElementType, setSearchByElementType] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Enhanced search - finds all matches with filters
  const performSearch = useCallback(() => {
    if (!findText) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];

    // Build search pattern
    let pattern: RegExp;
    try {
      if (useRegex) {
        pattern = new RegExp(findText, 'gi');
      } else {
        // Escape special regex characters for literal search
        const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(escaped, 'gi');
      }
    } catch {
      // Invalid regex
      setSearchResults([]);
      return;
    }

    // Find all matches
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const index = match.index;
      const length = match[0].length;

      // Get context (line containing the match)
      const lineStart = text.lastIndexOf('\n', index) + 1;
      const lineEnd = text.indexOf('\n', index + length);
      const context = text.substring(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();

      // Apply filters
      let includeResult = true;

      // Filter by character (look for character cue before dialogue)
      if (searchByCharacter && includeResult) {
        const textBefore = text.substring(Math.max(0, index - 500), index);
        const lines = textBefore.split('\n').reverse();
        let foundCharacter = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && /^[A-Z][A-Z\s.'()-]*$/.test(trimmed) && !trimmed.startsWith('INT.') && !trimmed.startsWith('EXT.')) {
            foundCharacter = trimmed.toLowerCase().includes(searchByCharacter.toLowerCase());
            break;
          }
          if (trimmed.startsWith('INT.') || trimmed.startsWith('EXT.') || trimmed.startsWith('I/E.')) {
            break;
          }
        }
        includeResult = foundCharacter;
      }

      // Filter by scene heading
      if (searchByScene && includeResult) {
        const textBefore = text.substring(0, index);
        const sceneMatches = textBefore.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.).*$/gim);
        if (sceneMatches && sceneMatches.length > 0) {
          const lastScene = sceneMatches[sceneMatches.length - 1];
          includeResult = lastScene.toLowerCase().includes(searchByScene.toLowerCase());
        } else {
          includeResult = false;
        }
      }

      // Filter by element type
      if (searchByElementType && includeResult) {
        const lineContent = context;
        let elementType = '';

        if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/.test(lineContent)) {
          elementType = 'scene-heading';
        } else if (/^[A-Z][A-Z\s.'()-]*$/.test(lineContent) && lineContent.length < 50) {
          elementType = 'character';
        } else if (/^\(.*\)$/.test(lineContent)) {
          elementType = 'parenthetical';
        } else if (/^(FADE OUT|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT|JUMP CUT|FADE TO BLACK|THE END)/i.test(lineContent)) {
          elementType = 'transition';
        } else {
          // Check if we're in dialogue (preceded by character cue)
          const beforeText = text.substring(Math.max(0, index - 300), index);
          const beforeLines = beforeText.split('\n').reverse();
          let isDialogue = false;
          for (let i = 0; i < beforeLines.length && i < 5; i++) {
            const trimmed = beforeLines[i].trim();
            if (trimmed && /^[A-Z][A-Z\s.'()-]*$/.test(trimmed) && trimmed.length < 50) {
              isDialogue = true;
              break;
            }
            if (trimmed && !/^\(.*\)$/.test(trimmed)) {
              break;
            }
          }
          elementType = isDialogue ? 'dialogue' : 'action';
        }

        includeResult = elementType === searchByElementType;
      }

      if (includeResult) {
        results.push({ index, length, context });
      }
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);

    // Navigate to first result if any
    if (results.length > 0 && textareaRef.current) {
      const first = results[0];
      textareaRef.current.selectionStart = first.index;
      textareaRef.current.selectionEnd = first.index + first.length;
      textareaRef.current.focus();
    }
  }, [findText, text, searchByCharacter, searchByScene, searchByElementType, useRegex, textareaRef]);

  const handleFind = useCallback(() => {
    if (searchResults.length === 0) {
      performSearch();
      return;
    }

    if (!textareaRef.current) return;

    // Go to next result
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);

    const result = searchResults[nextIndex];
    textareaRef.current.selectionStart = result.index;
    textareaRef.current.selectionEnd = result.index + result.length;
    textareaRef.current.focus();
  }, [searchResults, currentSearchIndex, performSearch, textareaRef]);

  const handleFindPrevious = useCallback(() => {
    if (searchResults.length === 0) return;
    if (!textareaRef.current) return;

    const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(prevIndex);

    const result = searchResults[prevIndex];
    textareaRef.current.selectionStart = result.index;
    textareaRef.current.selectionEnd = result.index + result.length;
    textareaRef.current.focus();
  }, [searchResults, currentSearchIndex, textareaRef]);

  const handleReplace = useCallback(() => {
    if (!findText || !textareaRef.current || searchResults.length === 0) return;

    const result = searchResults[currentSearchIndex];
    const start = result.index;
    const end = start + result.length;

    const newText = text.substring(0, start) + replaceText + text.substring(end);
    onChange(newText);

    // Re-search after replace
    setTimeout(() => performSearch(), 0);
  }, [findText, text, replaceText, searchResults, currentSearchIndex, onChange, performSearch, textareaRef]);

  const handleReplaceAll = useCallback(() => {
    if (!findText || searchResults.length === 0) return;

    // Replace from end to start to maintain indices
    let newText = text;
    const sortedResults = [...searchResults].sort((a, b) => b.index - a.index);

    for (const result of sortedResults) {
      newText = newText.substring(0, result.index) + replaceText + newText.substring(result.index + result.length);
    }

    onChange(newText);
    setSearchResults([]);
  }, [findText, text, replaceText, searchResults, onChange]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchByCharacter('');
    setSearchByScene('');
    setSearchByElementType('');
  }, []);

  // Re-search when filters change
  useEffect(() => {
    if (findText) {
      performSearch();
    }
  }, [searchByCharacter, searchByScene, searchByElementType, useRegex, findText, performSearch]);

  return {
    findText,
    setFindText: (text: string) => {
      setFindText(text);
      setSearchResults([]);
    },
    replaceText,
    setReplaceText,
    useRegex,
    setUseRegex: (value: boolean) => {
      setUseRegex(value);
      setSearchResults([]);
    },
    searchByCharacter,
    setSearchByCharacter: (char: string) => {
      setSearchByCharacter(char);
      setSearchResults([]);
    },
    searchByScene,
    setSearchByScene: (scene: string) => {
      setSearchByScene(scene);
      setSearchResults([]);
    },
    searchByElementType,
    setSearchByElementType: (type: string) => {
      setSearchByElementType(type);
      setSearchResults([]);
    },
    searchResults,
    currentSearchIndex,
    performSearch,
    handleFind,
    handleFindPrevious,
    handleReplace,
    handleReplaceAll,
    clearSearch,
  };
}
