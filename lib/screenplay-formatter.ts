import {
  MAX_TEXT_WIDTH,
  DIALOGUE_INDENT,
  PARENTHETICAL_INDENT,
  MAX_DIALOGUE_WIDTH,
} from './constants';
import {
  SCENE_HEADING_REGEX,
  SCENE_HEADING_WITH_NUMBER_REGEX,
  ACT_HEADER_REGEX,
  TRANSITION_START_REGEX,
  FADE_OUT_REGEX,
  CAMERA_DIRECTION_REGEX,
  END_MARKER_REGEX,
  CHARACTER_NAME_WITH_EXTENSION_REGEX,
  looksLikeScreenplay,
} from './screenplay-patterns';

export interface FormattedLine {
  type: 'title' | 'credit' | 'author' | 'logline' | 'act' | 'scene-heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition' | 'page-break';
  text: string;
  indentLevel: number;
  isCentered?: boolean;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderlined?: boolean;
}

export function formatScreenplay(text: string): string {
  const lines = text.split('\n');
  const formattedLines: string[] = [];
  let inDialogue = false;
  let lastWasCharacter = false;
  let isFirstLine = true;
  let inTitlePage = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    
    // Skip empty lines in certain contexts
    if (!trimmed) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      inDialogue = false;
      continue;
    }
    
    // Title page elements
    if (inTitlePage) {
      // Title (all caps at the beginning)
      if (isFirstLine && trimmed === trimmed.toUpperCase() && !trimmed.includes('.') && !trimmed.includes(':')) {
        formattedLines.push(centerText(trimmed));
        isFirstLine = false;
        continue;
      }
      
      // Written by
      if (trimmed.toLowerCase().startsWith('written by')) {
        formattedLines.push(centerText(trimmed));
        continue;
      }
      
      // Author name (after "Written by")
      if (prevLine.toLowerCase().startsWith('written by')) {
        formattedLines.push(centerText(trimmed));
        continue;
      }
      
      // LOGLINE
      if (trimmed.toUpperCase().startsWith('LOGLINE:')) {
        formattedLines.push(trimmed);
        inTitlePage = false; // End of title page
        continue;
      }
      
      // Logline content
      if (prevLine.toUpperCase().startsWith('LOGLINE:')) {
        formattedLines.push(trimmed);
        continue;
      }
    }
    
    // ACT headers
    if (ACT_HEADER_REGEX.test(trimmed)) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      formattedLines.push(centerText(trimmed.toUpperCase()));
      formattedLines.push('');
      inDialogue = false;
      continue;
    }
    
    // Scene headings with numbers (e.g., "1. INT. COFFEE SHOP - DAY")
    if (SCENE_HEADING_WITH_NUMBER_REGEX.test(trimmed)) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      formattedLines.push(trimmed.toUpperCase());
      inDialogue = false;
      continue;
    }
    
    // Scene headings without numbers
    if (SCENE_HEADING_REGEX.test(trimmed)) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      formattedLines.push(trimmed.toUpperCase());
      inDialogue = false;
      continue;
    }
    
    // Transitions (FADE IN:, CUT TO:, etc.)
    if (TRANSITION_START_REGEX.test(trimmed) && trimmed.endsWith(':')) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      formattedLines.push(rightAlign(trimmed.toUpperCase()));
      if (!FADE_OUT_REGEX.test(trimmed)) {
        formattedLines.push('');
      }
      inDialogue = false;
      continue;
    }
    
    // Special case for "THE END"
    if (END_MARKER_REGEX.test(trimmed)) {
      if (formattedLines.length > 0) {
        formattedLines.push('');
      }
      formattedLines.push(centerText(trimmed.toUpperCase()));
      continue;
    }
    
    // Character names with extensions (V.O.), (O.S.), (CONT'D)
    const characterMatch = trimmed.match(CHARACTER_NAME_WITH_EXTENSION_REGEX);
    if (characterMatch && !trimmed.includes('.') && trimmed.length < 35 &&
        (nextLine && !nextLine.match(/^[A-Z\s]+$/) && nextLine !== nextLine.toUpperCase())) {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      formattedLines.push(centerText(trimmed));
      inDialogue = true;
      lastWasCharacter = true;
      continue;
    }
    
    // Parentheticals
    if (trimmed.startsWith('(') && trimmed.endsWith(')') && inDialogue) {
      formattedLines.push(indentText(trimmed, PARENTHETICAL_INDENT));
      continue;
    }

    // Dialogue
    if (inDialogue && !trimmed.match(/^[A-Z\s]+$/) && trimmed.length > 0) {
      // Handle dialogue that may contain formatting or beats
      const dialogueLines = wrapDialogue(trimmed);
      dialogueLines.forEach(dialogueLine => {
        formattedLines.push(indentText(dialogueLine, DIALOGUE_INDENT));
      });
      
      // Check if dialogue continues
      if (!nextLine || nextLine === '' || 
          (nextLine.match(/^[A-Z]/) && nextLine === nextLine.toUpperCase() && !nextLine.includes('.'))) {
        inDialogue = false;
      }
      continue;
    }
    
    // Camera directions (PUSH IN, QUICK CUTS, etc.)
    if (CAMERA_DIRECTION_REGEX.test(trimmed)) {
      formattedLines.push(trimmed.toUpperCase());
      inDialogue = false;
      continue;
    }
    
    // Action lines
    inDialogue = false;
    formattedLines.push(line); // Preserve original spacing for action
  }
  
  return formattedLines.join('\n');
}

function centerText(text: string): string {
  const spaces = Math.max(0, Math.floor((MAX_TEXT_WIDTH - text.length) / 2));
  return ' '.repeat(spaces) + text;
}

function rightAlign(text: string): string {
  const spaces = Math.max(0, MAX_TEXT_WIDTH - text.length);
  return ' '.repeat(spaces) + text;
}

function indentText(text: string, spaces: number): string {
  return ' '.repeat(spaces) + text;
}

function wrapDialogue(text: string): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > MAX_DIALOGUE_WIDTH && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Enhanced auto-detection for pasted text
export function detectAndFormatScreenplay(text: string): string {
  if (looksLikeScreenplay(text)) {
    return formatScreenplay(text);
  }
  return text;
}