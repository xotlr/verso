/**
 * Classic Editor Types
 * Based on the Google Screenplay WASM implementation
 */

export enum BlockType {
  SCENE_HEADING = 'SCENE_HEADING',
  ACTION = 'ACTION',
  CHARACTER = 'CHARACTER',
  DIALOGUE = 'DIALOGUE',
  PARENTHETICAL = 'PARENTHETICAL',
  TRANSITION = 'TRANSITION',
  SECTION = 'SECTION', // Non-printing logic divider (Acts)
}

export enum RevisionColor {
  NONE = 'NONE',
  BLUE = 'BLUE',
  PINK = 'PINK',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  GOLDENROD = 'GOLDENROD',
  BUFF = 'BUFF',
  SALMON = 'SALMON',
  CHERRY = 'CHERRY'
}

export interface ScriptBlock {
  id: string;
  type: BlockType;
  content: string;
  sceneNumber?: number;
  revision?: RevisionColor;
}

export interface RenderedPage {
  pageNumber: number;
  blocks: ScriptBlock[];
  lineCount: number;
}

// --- METADATA TYPES ---
export interface Shot {
  id: string;
  shotType: 'WIDE' | 'FULL' | 'MED' | 'CU' | 'XCU' | 'INSERT' | 'EST';
  description: string;
}

export interface SceneMetadata {
  synopsis: string;
  notes: string;
  shots: Shot[];
}

export interface CharacterProfile {
  name: string;
  description: string;
  role: 'PROTAGONIST' | 'ANTAGONIST' | 'SUPPORTING' | 'MINOR';
}

export interface TitlePageMetadata {
  title: string;
  author: string;
  contact: string;
  logline: string;
  date: string;
}

// Keyed by the Scene Heading Block ID
export interface ScriptMetadata {
  titlePage: TitlePageMetadata;
  scenes: Record<string, SceneMetadata>;
  characters: Record<string, CharacterProfile>;
}

export interface Commit {
  id: string;
  timestamp: number;
  message: string;
  snapshot: {
    blocks: ScriptBlock[];
    metadata: ScriptMetadata;
  };
  stats: {
    totalBlocks: number;
    revisedBlocks: number;
  };
}


// --- STANDARD SCREENPLAY FORMAT CONSTANTS (US LETTER) ---
// 96 DPI used for web rendering of physical units
export const DPI = 96;

// Page Dimensions
export const PAGE_WIDTH_INCH = 8.5;
export const PAGE_HEIGHT_INCH = 11.0;
export const PAGE_WIDTH_PX = PAGE_WIDTH_INCH * DPI;   // 816px
export const PAGE_HEIGHT_PX = PAGE_HEIGHT_INCH * DPI; // 1056px

// Page Margins
export const MARGIN_TOP_INCH = 1.0;
export const MARGIN_BOTTOM_INCH = 1.0;
export const MARGIN_LEFT_INCH = 1.5;
export const MARGIN_RIGHT_INCH = 1.0;

export const MARGIN_TOP_PX = MARGIN_TOP_INCH * DPI;       // 96px
export const MARGIN_BOTTOM_PX = MARGIN_BOTTOM_INCH * DPI; // 96px
export const MARGIN_LEFT_PX = MARGIN_LEFT_INCH * DPI;     // 144px
export const MARGIN_RIGHT_PX = MARGIN_RIGHT_INCH * DPI;   // 96px

// Content Area Width (8.5 - 1.5 - 1.0 = 6.0 inches)
export const PRINTABLE_WIDTH_PX = PAGE_WIDTH_PX - MARGIN_LEFT_PX - MARGIN_RIGHT_PX; // 576px

// Typography (Courier Prime 12pt)
// 12pt = 1/6 inch. 1/6 * 96 = 16px.
export const FONT_SIZE_PX = 16;
export const LINE_HEIGHT_PX = 16; // Standard screenplay is single spaced (12pt leading)
export const CHAR_WIDTH_PX = 9.6; // 10 pitch (10 chars per inch)

// Pagination Limits
// 11 inches height - 1 inch top - 1 inch bottom = 9 inches printable
// 9 inches * 6 lines/inch = 54 lines
// Reducing to 52 for safety buffer against browser rendering differences
export const LINES_PER_PAGE = 52;

export interface BlockFormat {
  label: string;
  shortcut: string;
  uppercase: boolean;

  // Layout Engine Metrics
  maxCharsPerLine: number;
  marginTopLines: number;  // Blank lines before the block

  // Visual Rendering (Pixel values relative to printable area)
  marginLeftPx: number;
  widthPx: number;
  textAlign?: 'left' | 'right' | 'center';

  placeholder: string;
  nonPrinting?: boolean; // If true, takes 0 height in engine (but visible in editor)
}

// Helper: Convert inches to pixels
const inToPx = (inches: number) => inches * DPI;

// --- STRICT FORMATTING RULES ---
export const FORMATTING_RULES: Record<BlockType, BlockFormat> = {
  [BlockType.SCENE_HEADING]: {
    label: 'Scene Heading',
    shortcut: 'INT.',
    uppercase: true,
    maxCharsPerLine: 58,
    marginTopLines: 2, // 1 blank line before (technically 2 lines of height cost)
    marginLeftPx: 0,
    widthPx: PRINTABLE_WIDTH_PX,
    textAlign: 'left',
    placeholder: 'INT. LOCATION - TIME'
  },
  [BlockType.ACTION]: {
    label: 'Action',
    shortcut: '!',
    uppercase: false,
    maxCharsPerLine: 58,
    marginTopLines: 1,
    marginLeftPx: 0,
    widthPx: PRINTABLE_WIDTH_PX,
    textAlign: 'left',
    placeholder: 'Action description...'
  },
  [BlockType.CHARACTER]: {
    label: 'Character',
    shortcut: '@',
    uppercase: true,
    maxCharsPerLine: 37,
    marginTopLines: 1,
    // Spec: "Centered (approx 3.7" from left)"
    // 3.7" (absolute) - 1.5" (page margin) = 2.2" indent
    marginLeftPx: inToPx(2.2),
    widthPx: inToPx(3.5), // Enough width to hold name without wrapping aggressively
    textAlign: 'left', // Visually looks centered due to indent
    placeholder: 'CHARACTER'
  },
  [BlockType.DIALOGUE]: {
    label: 'Dialogue',
    shortcut: '',
    uppercase: false,
    maxCharsPerLine: 35,
    marginTopLines: 0,
    // Spec: "Margins: Left 2.5", Right 2.5""
    // Left: 2.5" (absolute) - 1.5" (page margin) = 1.0" indent
    // Right: 2.5" (absolute). Page Right Margin is 1.0". Extra indent = 1.5".
    // Width = 6.0" (printable) - 1.0" (indent) - 1.5" (extra right) = 3.5"
    marginLeftPx: inToPx(1.0),
    widthPx: inToPx(3.5),
    textAlign: 'left',
    placeholder: 'Dialogue...'
  },
  [BlockType.PARENTHETICAL]: {
    label: 'Parenthetical',
    shortcut: '(',
    uppercase: false,
    maxCharsPerLine: 25,
    marginTopLines: 0,
    // Spec: "Margins: Left 3", Right 2.9""
    // Left: 3.0" (absolute) - 1.5" (page margin) = 1.5" indent
    // Right: 2.9" (absolute). Page Right Margin is 1.0". Extra indent = 1.9".
    // Width = 6.0" - 1.5" - 1.9" = 2.6"
    marginLeftPx: inToPx(1.5),
    widthPx: inToPx(2.6),
    textAlign: 'left',
    placeholder: '(wryly)'
  },
  [BlockType.TRANSITION]: {
    label: 'Transition',
    shortcut: '>',
    uppercase: true,
    maxCharsPerLine: 16,
    marginTopLines: 2, // 1 blank line before
    // Spec: "Right aligned. Margins: Right 1""
    // Standard transition is flushed to the right margin.
    // We make it wide enough to type, but right align text.
    marginLeftPx: inToPx(4.0), // Starts far right
    widthPx: inToPx(2.0),      // Ends at 6.0" (printable edge)
    textAlign: 'right',
    placeholder: 'CUT TO:'
  },
  [BlockType.SECTION]: {
    label: 'Act',
    shortcut: '#',
    uppercase: true,
    maxCharsPerLine: 50,
    marginTopLines: 2, // Standard act break spacing
    marginLeftPx: 0,
    widthPx: PRINTABLE_WIDTH_PX,
    textAlign: 'center',
    placeholder: 'ACT ONE'
  }
};
