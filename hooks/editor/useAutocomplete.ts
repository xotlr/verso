'use client';

import { useState, useCallback, useMemo, RefObject } from 'react';
import { Scene, Character } from '@/types/screenplay';
import { AutocompleteSuggestion, getAutocompleteContext, AutocompleteContext } from '@/components/autocomplete-dropdown';

interface UseAutocompleteOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  onChange: (text: string) => void;
  scenes: Scene[];
  characters: Character[];
}

interface UseAutocompleteReturn {
  // State
  isOpen: boolean;
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  position: { top: number; left: number };

  // Actions
  setSelectedIndex: (index: number) => void;
  handleSelect: (suggestion: AutocompleteSuggestion) => void;
  close: () => void;
  updateAutocomplete: (text: string, cursorPosition: number) => void;
}

export function useAutocomplete({
  textareaRef,
  text,
  onChange,
  scenes,
  characters,
}: UseAutocompleteOptions): UseAutocompleteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [wordStart, setWordStart] = useState(0);
  const [currentWord, setCurrentWord] = useState('');

  // Extract known character names and locations
  const knownCharacterNames = useMemo(() => {
    return characters.map(c => c.name);
  }, [characters]);

  const knownLocations = useMemo(() => {
    return scenes.map(s => s.location?.name).filter(Boolean) as string[];
  }, [scenes]);

  // Standard screenplay suggestions
  const sceneHeadingPrefixes = useMemo<AutocompleteSuggestion[]>(() => [
    { value: 'INT. ', label: 'INT.', category: 'Interior' },
    { value: 'EXT. ', label: 'EXT.', category: 'Exterior' },
    { value: 'INT./EXT. ', label: 'INT./EXT.', category: 'Interior/Exterior' },
    { value: 'I/E. ', label: 'I/E.', category: 'Interior/Exterior (short)' },
  ], []);

  const timeOfDaySuggestions = useMemo<AutocompleteSuggestion[]>(() => [
    { value: 'DAY', label: 'DAY' },
    { value: 'NIGHT', label: 'NIGHT' },
    { value: 'DAWN', label: 'DAWN' },
    { value: 'DUSK', label: 'DUSK' },
    { value: 'MORNING', label: 'MORNING' },
    { value: 'AFTERNOON', label: 'AFTERNOON' },
    { value: 'EVENING', label: 'EVENING' },
    { value: 'CONTINUOUS', label: 'CONTINUOUS' },
    { value: 'MOMENTS LATER', label: 'MOMENTS LATER' },
    { value: 'SAME', label: 'SAME' },
    { value: 'LATER', label: 'LATER' },
  ], []);

  const transitionSuggestions = useMemo<AutocompleteSuggestion[]>(() => [
    { value: 'CUT TO:', label: 'CUT TO:' },
    { value: 'FADE TO:', label: 'FADE TO:' },
    { value: 'FADE OUT.', label: 'FADE OUT.' },
    { value: 'FADE IN:', label: 'FADE IN:' },
    { value: 'DISSOLVE TO:', label: 'DISSOLVE TO:' },
    { value: 'SMASH CUT TO:', label: 'SMASH CUT TO:' },
    { value: 'MATCH CUT TO:', label: 'MATCH CUT TO:' },
    { value: 'JUMP CUT TO:', label: 'JUMP CUT TO:' },
    { value: 'IRIS OUT.', label: 'IRIS OUT.' },
    { value: 'WIPE TO:', label: 'WIPE TO:' },
  ], []);

  // Get autocomplete suggestions based on context
  const getSuggestions = useCallback((context: AutocompleteContext): AutocompleteSuggestion[] => {
    const filter = context.currentWord.toUpperCase();

    switch (context.type) {
      case 'scene-heading':
        return sceneHeadingPrefixes.filter(s =>
          s.value.toUpperCase().startsWith(filter)
        );

      case 'location': {
        const uniqueLocations = [...new Set(knownLocations)];
        return uniqueLocations
          .filter(loc => loc.toUpperCase().includes(filter))
          .map(loc => ({ value: loc, label: loc, category: 'Known location' }));
      }

      case 'time-of-day':
        return timeOfDaySuggestions.filter(s =>
          s.value.toUpperCase().startsWith(filter)
        );

      case 'character':
        return knownCharacterNames
          .filter(name => name.toUpperCase().startsWith(filter))
          .map(name => ({ value: name, label: name, category: 'Character' }));

      case 'transition':
        return transitionSuggestions.filter(s =>
          s.value.toUpperCase().startsWith(filter)
        );

      default:
        return [];
    }
  }, [knownCharacterNames, knownLocations, sceneHeadingPrefixes, timeOfDaySuggestions, transitionSuggestions]);

  // Get caret coordinates in textarea for positioning autocomplete
  const getCaretCoordinates = useCallback((element: HTMLTextAreaElement, cursorPosition: number): { top: number; left: number } => {
    const mirror = document.createElement('div');
    const computed = getComputedStyle(element);

    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: ${computed.fontFamily};
      font-size: ${computed.fontSize};
      line-height: ${computed.lineHeight};
      padding: ${computed.padding};
      width: ${computed.width};
      box-sizing: ${computed.boxSizing};
    `;

    document.body.appendChild(mirror);

    const textBeforeCursor = element.value.substring(0, cursorPosition);
    mirror.textContent = textBeforeCursor;

    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);

    const rect = element.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();

    document.body.removeChild(mirror);

    return {
      top: rect.top + (markerRect.top - mirror.getBoundingClientRect().top) - element.scrollTop,
      left: rect.left + (markerRect.left - mirror.getBoundingClientRect().left) - element.scrollLeft,
    };
  }, []);

  // Update autocomplete based on current text and cursor position
  const updateAutocomplete = useCallback((inputText: string, cursorPosition: number) => {
    const context = getAutocompleteContext(inputText, cursorPosition);

    if (!context.shouldShow) {
      setIsOpen(false);
      return;
    }

    const newSuggestions = getSuggestions(context);

    if (newSuggestions.length === 0) {
      setIsOpen(false);
      return;
    }

    setSuggestions(newSuggestions);
    setCurrentWord(context.currentWord);
    setWordStart(context.wordStart);
    setSelectedIndex(0);

    if (textareaRef.current) {
      const pos = getCaretCoordinates(textareaRef.current, context.wordStart);
      setPosition({
        top: pos.top + 24,
        left: pos.left,
      });
    }

    setIsOpen(true);
  }, [getSuggestions, getCaretCoordinates, textareaRef]);

  // Handle autocomplete selection
  const handleSelect = useCallback((suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return;

    const before = text.substring(0, wordStart);
    const after = text.substring(wordStart + currentWord.length);
    const newText = before + suggestion.value + after;
    const newCursorPosition = wordStart + suggestion.value.length;

    onChange(newText);
    setIsOpen(false);

    // Restore cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPosition;
        textareaRef.current.selectionEnd = newCursorPosition;
        textareaRef.current.focus();
      }
    }, 0);
  }, [text, wordStart, currentWord, onChange, textareaRef]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    suggestions,
    selectedIndex,
    position,
    setSelectedIndex,
    handleSelect,
    close,
    updateAutocomplete,
  };
}
