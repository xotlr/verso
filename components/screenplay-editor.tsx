'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Scene, Character } from '@/types/screenplay';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AutocompleteDropdown,
  AutocompleteSuggestion,
  getAutocompleteContext,
  AutocompleteContext,
} from './autocomplete-dropdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/contexts/settings-context';
import { detectAndFormatScreenplay } from '@/lib/screenplay-formatter';
import { toast } from 'sonner';
import {
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  Search,
  Replace,
  Type,
  User,
  MessageSquare,
  Film,
  ArrowRight,
  Brackets,
  FileText,
  Printer,
  Clock,
  Check,
  X,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Hash,
  Eye,
  Users2,
  FileDown,
  Zap,
  Settings,
  Info,
  ZoomIn
} from 'lucide-react';

interface ScreenplayEditorProps {
  screenplayText: string;
  onChange: (text: string) => void;
  scenes: Scene[];
  characters: Character[];
  onSceneClick?: (scene: Scene) => void;
  selectedSceneId?: string;
  onVisualize?: () => void;
  onAIAnalysis?: () => void;
}

interface HistoryEntry {
  text: string;
  timestamp: number;
  cursorPosition: number;
  selectionEnd: number;
}

export function ScreenplayEditor({
  screenplayText,
  onChange,
  scenes,
  characters,
  onSceneClick,
  selectedSceneId,
  onVisualize,
  onAIAnalysis
}: ScreenplayEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([{ text: '', timestamp: Date.now(), cursorPosition: 0, selectionEnd: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(Date.now());
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSceneNavigator, setShowSceneNavigator] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showPageBreaks, setShowPageBreaks] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Autocomplete state
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [autocompleteWordStart, setAutocompleteWordStart] = useState(0);
  const [autocompleteCurrentWord, setAutocompleteCurrentWord] = useState('');

  // Settings for zoom
  const { settings, updateEditorSettings } = useSettings();
  const zoom = settings.editor.zoom;

  const zoomLevels = [50, 75, 100, 125, 150, 200];

  const handleZoomChange = (value: string) => {
    updateEditorSettings({ zoom: parseInt(value) });
  };

  // Extract known character names, locations, and other data for autocomplete
  const knownCharacterNames = useMemo(() => {
    return characters.map(c => c.name);
  }, [characters]);

  const knownLocations = useMemo(() => {
    return scenes.map(s => s.location?.name).filter(Boolean) as string[];
  }, [scenes]);

  // Standard screenplay suggestions (memoized to prevent unnecessary re-renders)
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

      case 'location':
        const uniqueLocations = [...new Set(knownLocations)];
        return uniqueLocations
          .filter(loc => loc.toUpperCase().includes(filter))
          .map(loc => ({ value: loc, label: loc, category: 'Known location' }));

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
  const getCaretCoordinates = useCallback((element: HTMLTextAreaElement, position: number): { top: number; left: number } => {
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

    const textBeforeCursor = element.value.substring(0, position);
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
  const updateAutocomplete = useCallback((text: string, cursorPosition: number) => {
    const context = getAutocompleteContext(text, cursorPosition);

    if (!context.shouldShow) {
      setAutocompleteOpen(false);
      return;
    }

    const suggestions = getSuggestions(context);

    if (suggestions.length === 0) {
      setAutocompleteOpen(false);
      return;
    }

    setAutocompleteSuggestions(suggestions);
    setAutocompleteCurrentWord(context.currentWord);
    setAutocompleteWordStart(context.wordStart);
    setAutocompleteSelectedIndex(0);

    if (textareaRef.current) {
      const pos = getCaretCoordinates(textareaRef.current, context.wordStart);
      setAutocompletePosition({
        top: pos.top + 24,
        left: pos.left,
      });
    }

    setAutocompleteOpen(true);
  }, [getSuggestions, getCaretCoordinates]);

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return;

    const text = screenplayText;
    const before = text.substring(0, autocompleteWordStart);
    const after = text.substring(autocompleteWordStart + autocompleteCurrentWord.length);
    const newText = before + suggestion.value + after;
    const newCursorPosition = autocompleteWordStart + suggestion.value.length;

    onChange(newText);
    setAutocompleteOpen(false);

    // Restore cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPosition;
        textareaRef.current.selectionEnd = newCursorPosition;
        textareaRef.current.focus();
      }
    }, 0);
  }, [screenplayText, autocompleteWordStart, autocompleteCurrentWord, onChange]);

  // Calculate statistics
  useEffect(() => {
    const words = screenplayText.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
    
    // Approximate page count (1 page ≈ 250 words or 55 lines for screenplays)
    const lines = screenplayText.split('\n').length;
    const pages = Math.max(1, Math.ceil(lines / 55));
    setPageCount(pages);
    
    // Calculate current page based on cursor position
    if (textareaRef.current) {
      const textBeforeCursor = screenplayText.substring(0, textareaRef.current.selectionStart);
      const linesBeforeCursor = textBeforeCursor.split('\n').length;
      setCurrentPage(Math.max(1, Math.ceil(linesBeforeCursor / 55)));
    }
  }, [screenplayText]);

  // Auto-save
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 30000); // Auto-save every 30 seconds

    setIsSaved(false);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [screenplayText]);

  // Track history with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      const newEntry: HistoryEntry = {
        text: screenplayText,
        timestamp: Date.now(),
        cursorPosition: textareaRef.current?.selectionStart || 0,
        selectionEnd: textareaRef.current?.selectionEnd || 0
      };

      // Don't add if text hasn't changed
      if (history[historyIndex]?.text === screenplayText) return;

      // Add new entry
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      
      // Keep only last 100 entries
      if (newHistory.length > 100) {
        newHistory.shift();
      }
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, 500); // Debounce history tracking

    return () => clearTimeout(timer);
  }, [screenplayText]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      
      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Find/Replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      
      // Quick formatting
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        wrapSelection('**', '**');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        wrapSelection('*', '*');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        wrapSelection('_', '_');
      }
      
      // Quick inserts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch(e.key) {
          case 'S':
            e.preventDefault();
            insertSceneHeading();
            break;
          case 'C':
            e.preventDefault();
            insertCharacter();
            break;
          case 'D':
            e.preventDefault();
            insertDialogue();
            break;
          case 'A':
            e.preventDefault();
            insertAction();
            break;
          case 'T':
            e.preventDefault();
            insertTransition();
            break;
          case 'P':
            e.preventDefault();
            insertParenthetical();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Selection tracking
  useEffect(() => {
    const handleSelectionChange = () => {
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (start !== end) {
          setSelectedText(screenplayText.substring(start, end));
        } else {
          setSelectedText('');
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [screenplayText]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex].text);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = history[newIndex].cursorPosition;
          textareaRef.current.selectionEnd = history[newIndex].selectionEnd;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex].text);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = history[newIndex].cursorPosition;
          textareaRef.current.selectionEnd = history[newIndex].selectionEnd;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleSave = () => {
    localStorage.setItem('currentScreenplay', screenplayText);
    setIsSaved(true);
    setLastSaveTime(Date.now());
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Auto-format if it looks like a screenplay
    const formatted = detectAndFormatScreenplay(pastedText);
    
    if (!textareaRef.current) {
      onChange(formatted);
      return;
    }
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = screenplayText;
    
    const newText = currentText.substring(0, start) + formatted + currentText.substring(end);
    onChange(newText);
    
    // Move cursor after pasted text
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + formatted.length;
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleFormat = () => {
    const formatted = detectAndFormatScreenplay(screenplayText);
    onChange(formatted);
  };

  const wrapSelection = (before: string, after: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = screenplayText;
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
  };

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = screenplayText;
    
    const newText = currentText.substring(0, start) + text + currentText.substring(end);
    onChange(newText);
    
    // Move cursor after inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + text.length;
        textareaRef.current.selectionEnd = start + text.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const insertSceneHeading = () => {
    insertAtCursor('\n\nINT. LOCATION - TIME\n\n');
  };

  const insertCharacter = () => {
    const characterName = '                              CHARACTER NAME';
    insertAtCursor('\n' + characterName + '\n');
  };

  const insertDialogue = () => {
    insertAtCursor('                         Dialogue goes here.\n');
  };

  const insertAction = () => {
    insertAtCursor('\nAction description here.\n\n');
  };

  const insertTransition = () => {
    insertAtCursor('\n                                                          CUT TO:\n\n');
  };

  const insertParenthetical = () => {
    insertAtCursor('                         (parenthetical)\n');
  };

  // Insert dual dialogue template
  // Uses ^ marker (Fountain standard) to indicate dual dialogue
  const insertDualDialogue = () => {
    const dualDialogueTemplate = `
                              CHARACTER ONE
                    First character's dialogue here.

                              CHARACTER TWO ^
                    Second character's dialogue here
                    (speaks simultaneously).

`;
    insertAtCursor(dualDialogueTemplate);
  };

  const convertToUpperCase = () => {
    if (!textareaRef.current || !selectedText) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = screenplayText;
    
    const newText = text.substring(0, start) + selectedText.toUpperCase() + text.substring(end);
    onChange(newText);
  };

  const convertToLowerCase = () => {
    if (!textareaRef.current || !selectedText) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = screenplayText;
    
    const newText = text.substring(0, start) + selectedText.toLowerCase() + text.substring(end);
    onChange(newText);
  };

  const addContd = () => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const lines = screenplayText.substring(0, cursorPos).split('\n');
    const currentLineIndex = lines.length - 1;
    
    // Find the nearest character name above
    for (let i = currentLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === line.toUpperCase() && line.length > 0 && !line.includes('.')) {
        // This is likely a character name
        const newLine = line + " (CONT'D)";
        lines[i] = lines[i].replace(line, newLine);
        const newText = lines.join('\n') + screenplayText.substring(cursorPos);
        onChange(newText);
        break;
      }
    }
  };

  const addExtension = (extension: string) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const lines = screenplayText.substring(0, cursorPos).split('\n');
    const currentLineIndex = lines.length - 1;
    
    // Find the nearest character name above
    for (let i = currentLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === line.toUpperCase() && line.length > 0 && !line.includes('.')) {
        // This is likely a character name
        const newLine = line + ` (${extension})`;
        lines[i] = lines[i].replace(line, newLine);
        const newText = lines.join('\n') + screenplayText.substring(cursorPos);
        onChange(newText);
        break;
      }
    }
  };

  const handleFind = () => {
    if (!findText || !textareaRef.current) return;
    
    const start = textareaRef.current.selectionEnd;
    const index = screenplayText.indexOf(findText, start);
    
    if (index !== -1) {
      textareaRef.current.selectionStart = index;
      textareaRef.current.selectionEnd = index + findText.length;
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Wrap around to beginning
      const wrapIndex = screenplayText.indexOf(findText);
      if (wrapIndex !== -1) {
        textareaRef.current.selectionStart = wrapIndex;
        textareaRef.current.selectionEnd = wrapIndex + findText.length;
        textareaRef.current.focus();
      }
    }
  };

  const handleReplace = () => {
    if (!findText || !textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = screenplayText.substring(start, end);
    
    if (selectedText === findText) {
      const newText = screenplayText.substring(0, start) + replaceText + screenplayText.substring(end);
      onChange(newText);
      
      // Move to next occurrence
      setTimeout(() => handleFind(), 0);
    } else {
      handleFind();
    }
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    
    const newText = screenplayText.split(findText).join(replaceText);
    onChange(newText);
    setShowFindReplace(false);
  };

  const exportAsPDF = () => {
    // In a real implementation, this would use a library like jsPDF
    window.print();
  };

  const exportAsFountain = () => {
    const blob = new Blob([screenplayText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenplay.fountain';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsFDX = () => {
    // In a real implementation, this would convert to Final Draft XML format
    toast.info('Final Draft export would be implemented with proper FDX conversion');
  };

  // Import handlers
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fountain,.fdx,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.fdx')) {
          // Import FDX
          const { parseFDX } = await import('@/lib/fdx-parser');
          const result = parseFDX(text);
          onChange(result.content);
        } else if (fileName.endsWith('.fountain') || fileName.endsWith('.txt')) {
          // Import Fountain
          const { parseFountain, isFountainFormat } = await import('@/lib/fountain-parser');
          if (isFountainFormat(text)) {
            const result = parseFountain(text);
            onChange(result.content);
          } else {
            // Plain text - just import as is
            onChange(text);
          }
        } else {
          onChange(text);
        }
      } catch (error) {
        console.error('Error importing file:', error);
        toast.error('Error importing file. Please check the file format.');
      }
    };
    input.click();
  }, [onChange]);

  // Detect current screenplay element type based on line content and context
  type ElementType = 'scene-heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition' | 'empty';

  const detectElementType = useCallback((text: string, cursorPos: number): ElementType => {
    const beforeCursor = text.substring(0, cursorPos);
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const lineEnd = text.indexOf('\n', cursorPos);
    const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd).trim();

    // Get previous line for context
    const prevLineEnd = lineStart > 0 ? lineStart - 1 : 0;
    const prevLineStart = text.lastIndexOf('\n', prevLineEnd - 1) + 1;
    const previousLine = text.substring(prevLineStart, prevLineEnd).trim();

    // Empty line
    if (currentLine === '') {
      return 'empty';
    }

    // Scene heading (INT./EXT.)
    if (/^(INT|EXT|INT\/EXT|I\/E)[\.\s]/i.test(currentLine)) {
      return 'scene-heading';
    }

    // Transition (ends with TO: or is FADE IN:/FADE OUT.)
    if (/^(CUT|FADE|DISSOLVE|SMASH|MATCH|JUMP|IRIS|WIPE)/i.test(currentLine) ||
        currentLine.endsWith('TO:') ||
        currentLine === 'FADE IN:' ||
        currentLine === 'FADE OUT.') {
      return 'transition';
    }

    // Parenthetical (starts and ends with parentheses)
    if (currentLine.startsWith('(') && currentLine.endsWith(')')) {
      return 'parenthetical';
    }

    // Character name (all caps, after blank line, no periods except abbreviations)
    if (previousLine === '' && currentLine === currentLine.toUpperCase() && currentLine.length < 40) {
      // Check it's not a scene heading or transition
      if (!/^(INT|EXT|INT\/EXT|I\/E)[\.\s]/i.test(currentLine) &&
          !currentLine.endsWith('TO:') &&
          !currentLine.includes('.') || currentLine.includes("'")) {
        return 'character';
      }
    }

    // Dialogue (after character or parenthetical)
    const prevType = (() => {
      if (previousLine === '') return 'empty';
      if (/^(INT|EXT|INT\/EXT|I\/E)[\.\s]/i.test(previousLine)) return 'scene-heading';
      if (previousLine.startsWith('(') && previousLine.endsWith(')')) return 'parenthetical';
      if (previousLine === previousLine.toUpperCase() && previousLine.length < 40 && !previousLine.includes('.')) return 'character';
      return 'action';
    })();

    if (prevType === 'character' || prevType === 'parenthetical') {
      // Check if current line looks like dialogue (not all caps, mixed case)
      if (currentLine !== currentLine.toUpperCase()) {
        return 'dialogue';
      }
    }

    // Default to action
    return 'action';
  }, []);

  // Smart Tab/Enter element switching
  const handleSmartKeydown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const text = screenplayText;

    // Skip if autocomplete is open (let autocomplete handle Tab/Enter)
    if (autocompleteOpen) {
      return;
    }

    // Get current line info
    const beforeCursor = text.substring(0, cursorPos);
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const lineEnd = text.indexOf('\n', cursorPos);
    const currentLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
    const isAtLineEnd = cursorPos === (lineEnd === -1 ? text.length : lineEnd) || text.substring(cursorPos, lineEnd === -1 ? text.length : lineEnd).trim() === '';

    // Only apply smart behavior at end of line
    if (!isAtLineEnd) return;

    const elementType = detectElementType(text, cursorPos);

    // Tab key - switch to next element type
    if (e.key === 'Tab' && !e.shiftKey) {
      let insertText = '';

      switch (elementType) {
        case 'scene-heading':
          // After scene heading, Tab goes to Action
          insertText = '\n\n';
          break;
        case 'action':
          // After action, Tab goes to Character
          insertText = '\n\n                              ';
          break;
        case 'character':
          // After character, Tab goes to Dialogue (but shift to parenthetical first?)
          insertText = '\n                    ';
          break;
        case 'dialogue':
          // After dialogue, Tab goes to next Character
          insertText = '\n\n                              ';
          break;
        case 'parenthetical':
          // After parenthetical, Tab goes to Dialogue
          insertText = '\n                    ';
          break;
        case 'transition':
          // After transition, Tab goes to Scene Heading
          insertText = '\n\n';
          break;
        default:
          return; // Don't prevent default for empty lines
      }

      e.preventDefault();
      const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos);
      const newCursorPos = cursorPos + insertText.length;
      onChange(newText);

      setTimeout(() => {
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
        textarea.focus();
      }, 0);
      return;
    }

    // Enter key - continue same element or go to next logical element
    if (e.key === 'Enter' && !e.shiftKey) {
      // Check if we're on an empty line (double enter = new element)
      if (currentLine.trim() === '') {
        return; // Let default Enter behavior happen
      }

      let insertText = '\n';

      switch (elementType) {
        case 'scene-heading':
          // After scene heading, Enter goes to Action
          insertText = '\n\n';
          break;
        case 'action':
          // After action, Enter continues action (single newline)
          insertText = '\n';
          break;
        case 'character':
          // After character, Enter goes to Parenthetical
          insertText = '\n                    (';
          break;
        case 'dialogue':
          // After dialogue, Enter continues dialogue
          insertText = '\n                    ';
          break;
        case 'parenthetical':
          // After parenthetical, Enter goes to Dialogue
          insertText = '\n                    ';
          break;
        case 'transition':
          // After transition, Enter goes to Scene Heading
          insertText = '\n\n';
          break;
        default:
          return;
      }

      // Only override for special formatting
      if (insertText !== '\n') {
        e.preventDefault();
        const newText = text.substring(0, cursorPos) + insertText + text.substring(cursorPos);
        const newCursorPos = cursorPos + insertText.length;
        onChange(newText);

        setTimeout(() => {
          textarea.selectionStart = newCursorPos;
          textarea.selectionEnd = newCursorPos;
          textarea.focus();
        }, 0);
      }
    }
  }, [screenplayText, autocompleteOpen, detectElementType, onChange]);

  // Satisfying typing feedback
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle smart Tab/Enter first
    handleSmartKeydown(e);

    // Trigger typing animation
    setIsTyping(true);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Reset typing state after a short delay
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 150);

    // Add subtle haptic-like visual feedback
    if (containerRef.current && e.key.length === 1) {
      containerRef.current.style.transform = 'scale(1.0005)';
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.transform = 'scale(1)';
        }
      }, 50);
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const getLineNumbers = () => {
    if (!showLineNumbers) return null;
    
    const lines = screenplayText.split('\n');
    return (
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted border-r border-border text-right pr-2 pt-16 text-xs text-muted-foreground select-none">
        {lines.map((_, i) => (
          <div key={i} className="leading-relaxed" style={{ lineHeight: '1.5' }}>
            {i + 1}
          </div>
        ))}
      </div>
    );
  };

  const getPageBreaks = () => {
    if (!showPageBreaks) return null;
    
    const pageBreaks = [];
    for (let i = 1; i < pageCount; i++) {
      const topPosition = i * 55 * 1.5 * 16; // 55 lines * line height * font size
      pageBreaks.push(
        <div
          key={i}
          className="absolute left-0 right-0 border-t-2 border-dashed border-border pointer-events-none"
          style={{ top: `${topPosition}px` }}
        >
          <span className="absolute -top-3 right-4 bg-card px-2 text-xs text-muted-foreground">
            Page {i + 1}
          </span>
        </div>
      );
    }
    
    return pageBreaks;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Enhanced Toolbar */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left side - File operations */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 pr-2 border-r">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRedo}
                  disabled={historyIndex === history.length - 1}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1 pr-2 border-r">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSave}
                  title="Save (Ctrl+S)"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={exportAsPDF}
                  title="Export as PDF"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.print()}
                  title="Print"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleImport}
                  title="Import (Fountain, FDX)"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>

              {/* Format tools */}
              <div className="flex items-center gap-1 pr-2 border-r">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => wrapSelection('**', '**')}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => wrapSelection('*', '*')}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => wrapSelection('_', '_')}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Quick inserts */}
              <div className="flex items-center gap-1 pr-2 border-r">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertSceneHeading}
                  title="Insert Scene Heading (Ctrl+Shift+S)"
                >
                  <Film className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertCharacter}
                  title="Insert Character (Ctrl+Shift+C)"
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertDialogue}
                  title="Insert Dialogue (Ctrl+Shift+D)"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertAction}
                  title="Insert Action (Ctrl+Shift+A)"
                >
                  <Type className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertTransition}
                  title="Insert Transition (Ctrl+Shift+T)"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertParenthetical}
                  title="Insert Parenthetical (Ctrl+Shift+P)"
                >
                  <Brackets className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={insertDualDialogue}
                  title="Insert Dual Dialogue"
                >
                  <Users2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Tools */}
              <div className="flex items-center gap-1 pr-2 border-r">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFormat}
                  title="Auto-format screenplay"
                >
                  <Zap className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFindReplace(!showFindReplace)}
                  title="Find & Replace (Ctrl+F)"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSceneNavigator(!showSceneNavigator)}
                  title="Scene Navigator"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCharacterList(!showCharacterList)}
                  title="Character List"
                >
                  <Users2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Right side - Status and tools */}
            <div className="flex items-center gap-4">
              {/* AI and Visualization */}
              <div className="flex items-center gap-2 pr-2 border-r">
                {onVisualize && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onVisualize}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualize
                  </Button>
                )}
                {onAIAnalysis && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onAIAnalysis}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    AI Analysis
                  </Button>
                )}
              </div>
              
              {/* View options */}
              <div className="flex items-center gap-2">
                {/* Zoom dropdown */}
                <Select value={zoom.toString()} onValueChange={handleZoomChange}>
                  <SelectTrigger className="w-[90px] h-8 rounded-xl text-xs">
                    <ZoomIn className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {zoomLevels.map((level) => (
                      <SelectItem key={level} value={level.toString()} className="rounded-lg">
                        {level}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant={showLineNumbers ? "secondary" : "ghost"}
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  title="Toggle Line Numbers"
                  className="rounded-xl"
                >
                  <Hash className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showPageBreaks ? "secondary" : "ghost"}
                  onClick={() => setShowPageBreaks(!showPageBreaks)}
                  title="Toggle Page Breaks"
                  className="rounded-xl"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Status */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {isSaved ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  <span>{isSaved ? 'Saved' : 'Unsaved changes'}</span>
                </div>
                <div>Page {currentPage}/{pageCount}</div>
                <div>{wordCount.toLocaleString()} words</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Second toolbar row - Context sensitive */}
        {selectedText && (
          <div className="px-4 py-2 border-t border-border bg-muted">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Selection:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={convertToUpperCase}
              >
                To UPPERCASE
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={convertToLowerCase}
              >
                to lowercase
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={addContd}
              >
                Add (CONT'D)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addExtension('V.O.')}
              >
                Add (V.O.)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addExtension('O.S.')}
              >
                Add (O.S.)
              </Button>
            </div>
          </div>
        )}
        
        {/* Find & Replace Bar */}
        {showFindReplace && (
          <div className="px-4 py-2 border-t border-border bg-muted">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Find..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                className="w-48"
              />
              <Input
                placeholder="Replace with..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
                className="w-48"
              />
              <Button size="sm" onClick={handleFind}>Find</Button>
              <Button size="sm" onClick={handleReplace}>Replace</Button>
              <Button size="sm" onClick={handleReplaceAll}>Replace All</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFindReplace(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scene Navigator */}
        {showSceneNavigator && (
          <div className="w-64 border-r border-border bg-card overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-3 text-foreground">Scene Navigator</h3>
              <div className="space-y-2">
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => {
                      // Jump to scene in editor
                      const sceneIndex = screenplayText.indexOf(scene.heading);
                      if (sceneIndex !== -1 && textareaRef.current) {
                        textareaRef.current.selectionStart = sceneIndex;
                        textareaRef.current.selectionEnd = sceneIndex;
                        textareaRef.current.focus();
                        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded hover:bg-accent text-sm",
                      selectedSceneId === scene.id && "bg-accent"
                    )}
                  >
                    <div className="font-medium text-foreground">Scene {scene.number}</div>
                    <div className="text-xs text-muted-foreground">{scene.heading}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Character List */}
        {showCharacterList && (
          <div className="w-64 border-r border-border bg-card overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-3 text-foreground">Characters</h3>
              <div className="space-y-2">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className="p-2 rounded hover:bg-accent"
                  >
                    <div className="font-medium text-foreground">{character.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {character.appearances.length} appearances
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Editor */}
        <div className="flex-1 overflow-auto relative editor-page-container">
          <div className="min-h-full py-8 px-4">
            <div
              className="origin-top transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <div
                ref={containerRef}
                className={cn(
                  "editor-document min-h-[11in] relative typing-container",
                  "transition-all duration-200 ease-out",
                  isTyping && "is-typing"
                )}
              >
                {getLineNumbers()}
                {getPageBreaks()}
                <textarea
                  ref={textareaRef}
                  value={screenplayText}
                  onChange={(e) => {
                    onChange(e.target.value);
                    updateAutocomplete(e.target.value, e.target.selectionStart);
                  }}
                  onKeyDown={handleKeyDown}
                  onKeyUp={(e) => {
                    // Update autocomplete on cursor movement
                    const target = e.target as HTMLTextAreaElement;
                    updateAutocomplete(target.value, target.selectionStart);
                  }}
                  onClick={(e) => {
                    // Update autocomplete on click (cursor position change)
                    const target = e.target as HTMLTextAreaElement;
                    updateAutocomplete(target.value, target.selectionStart);
                  }}
                  onPaste={handlePaste}
                  className={cn(
                    "w-full min-h-[11in] p-16",
                    "bg-transparent text-foreground",
                    "font-screenplay text-xs leading-relaxed",
                    "border-0 outline-none resize-none",
                    "typing-textarea",
                    showLineNumbers && "pl-20"
                  )}
                  style={{
                    lineHeight: '1.5',
                  }}
                  placeholder="FADE IN:"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Export menu */}
      <div className="absolute bottom-4 right-4">
        <div className="relative group">
          <Button
            size="sm"
            variant="outline"
            className="shadow-lg bg-card"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-card rounded-lg shadow-xl border border-border p-2 space-y-1">
              <button
                onClick={exportAsPDF}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-accent rounded text-foreground"
              >
                Export as PDF
              </button>
              <button
                onClick={exportAsFountain}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-accent rounded text-foreground"
              >
                Export as Fountain
              </button>
              <button
                onClick={exportAsFDX}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-accent rounded text-foreground"
              >
                Export as Final Draft
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      <AutocompleteDropdown
        suggestions={autocompleteSuggestions}
        isOpen={autocompleteOpen}
        onSelect={handleAutocompleteSelect}
        onClose={() => setAutocompleteOpen(false)}
        position={autocompletePosition}
        selectedIndex={autocompleteSelectedIndex}
        onSelectedIndexChange={setAutocompleteSelectedIndex}
      />
    </div>
  );
}