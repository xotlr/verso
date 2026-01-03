export type ThemePreset =
  | 'verso' | 'paper'  // Essential
  | 'matcha' | 'neovictorian'  // Vintage
  | 'romance' | 'horror'  // Genre
  | 'mission-control' | 'cyberpunk' | 'typewriter' | 'screenplay-classic' | 'sepia' | 'midnight' | 'studio' | 'belle-epoque' | 'faerun';  // Premium

export interface ThemeMetadata {
  name: string;
  subtitle: string;
}

export const themeMetadata: Record<ThemePreset, ThemeMetadata> = {
  // Essential themes
  verso: { name: 'Verso', subtitle: 'Default dark theme' },
  paper: { name: 'Paper', subtitle: 'Classic screenplay feel' },
  // Vintage themes
  matcha: { name: 'Matcha', subtitle: 'Chinese retro charm' },
  neovictorian: { name: 'Neovictorian', subtitle: 'European vintage' },
  // Genre themes
  romance: { name: 'Romance', subtitle: 'Soft and heartfelt' },
  horror: { name: 'Horror', subtitle: 'Blood red on gray' },
  // Premium themes
  'mission-control': { name: 'Mission Control', subtitle: 'Industrial precision' },
  cyberpunk: { name: 'Cyberpunk', subtitle: 'Neon retrofuture' },
  typewriter: { name: 'Typewriter', subtitle: 'Classic typing feel' },
  'screenplay-classic': { name: 'Screenplay Classic', subtitle: 'Hollywood golden age' },
  sepia: { name: 'Sepia', subtitle: 'Warm vintage tones' },
  midnight: { name: 'Midnight', subtitle: 'Deep night writing' },
  studio: { name: 'Studio', subtitle: 'Professional workspace' },
  'belle-epoque': { name: 'Belle Époque', subtitle: 'Parisian elegance' },
  faerun: { name: 'Faerûn', subtitle: 'Fantasy adventure' },
};

export type UIFont = 'inter' | 'sf-pro' | 'geist' | 'ibm-plex' | 'plus-jakarta' | 'space-grotesk' | 'dot-gothic' | 'audiowide' | 'oxanium' | 'chakra-petch';
export type ScreenplayFont = 'courier-prime' | 'courier-new' | 'courier-final-draft';
export type AccessibilityFont = 'default' | 'sans' | 'system' | 'dyslexic';

// ============================================
// PREMIUM THEME TYPES
// ============================================

export type BackgroundPattern =
  | 'none'
  | 'dot-matrix'       // Nothing/Glyph style dots
  | 'blueprint-grid'   // Engineering blueprint
  | 'scanlines'        // CRT horizontal lines
  | 'venetian-blinds'  // Film noir shadow stripes
  | 'parchment';       // Aged paper texture

export type PageChrome =
  | 'none'
  | 'registration-marks'   // Print registration L-brackets
  | 'illuminated-border';  // Medieval manuscript border

export type AmbientEffect =
  | 'none'
  | 'film-grain'      // 35mm film noise
  | 'crt-flicker'     // CRT phosphor flicker
  | 'candlelight'     // Subtle brightness variation
  | 'neon-glow';      // Accent element glow pulses

export type UIChrome =
  | 'default'
  | 'brutalist'       // Sharp corners, offset shadows
  | 'glassmorphic'    // Frosted glass effect
  | 'neumorphic';     // Soft embossed shadows

export interface PremiumThemeFeatures {
  backgroundPattern: BackgroundPattern;
  patternOpacity: number;        // 0-1
  patternColor?: string;         // HSL string, defaults to foreground
  pageChrome: PageChrome;
  chromeOpacity: number;         // 0-1
  ambientEffect: AmbientEffect;
  ambientIntensity: number;      // 0-1
  uiChrome: UIChrome;
}

export type LayoutMode = 'modern' | 'classic';

// Cursor types
export type CursorMode = 'native' | 'line' | 'block' | 'underscore';
export type CursorBlinkStyle = 'none' | 'blink' | 'smooth' | 'expand';

export interface CursorSettings {
  mode: CursorMode;
  blinkStyle: CursorBlinkStyle;
  blinkSpeed: number;           // 400-1000ms, default 530ms
  color: string | null;         // null = use foreground color
  glowEnabled: boolean;
  glowIntensity: number;        // 0-1
  width: number;                // 1-4px for line cursor
}

export interface ColorScheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  page: string;
  pageForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ActColorScheme {
  bg: string;
  border: string;
}

export interface VisualizationPalette {
  beatColors: string[];           // 8 colors for beat cards
  actColors: {
    act1: ActColorScheme;
    act2a: ActColorScheme;
    act2b: ActColorScheme;
    act3: ActColorScheme;
  };
  sceneColors: string[];          // 8 colors for scenes
  characterColors: string[];      // 10 colors for characters
  locationColors: string[];       // 10 colors for locations
}

export interface VisualSettings {
  themePreset: ThemePreset;
  lightColors: ColorScheme;
  darkColors: ColorScheme;
  lightVisualization: VisualizationPalette;
  darkVisualization: VisualizationPalette;
  uiFont: UIFont;
  screenplayFont: ScreenplayFont;
  fontSize: number; // 12-18pt for UI
  borderRadius: number; // 0-16px
  animationSpeed: number; // 0.1-0.5s
  cursor: CursorSettings;
  premium?: Partial<PremiumThemeFeatures>; // Premium theme features (opt-in)
}

export interface AutocompleteSettings {
  enabled: boolean;
  delayMs: number; // 0 = immediate, 5000 = 5 seconds
}

export type PageStyle = 'themed' | 'plain';

// Scene number position for production/shooting scripts
export type SceneNumberPosition = 'left' | 'right' | 'both';

export interface EditorSettings {
  autocomplete: AutocompleteSettings;
  textContrast: number; // 15-35, default 25 (lightness percentage)
  typewriterMode: boolean;
  focusLineHighlight: boolean;
  scrollMode: 'discrete' | 'continuous';
  pageStyle: PageStyle; // 'themed' uses theme colors, 'plain' uses off-white
  showSceneNumbers: boolean; // Show scene numbers next to scene headings
  sceneNumberPosition: SceneNumberPosition; // Position: left, right, or both margins
  showPlaceholders: boolean; // Show ghost text hints in empty elements
  yjsCollaboration: boolean; // Enable Yjs CRDT real-time collaboration
  readingMode: boolean; // Reading mode - read-only with minimal UI
  showBeginnerTips: boolean; // Show contextual tips for screenwriting beginners
}

export interface InterfaceSettings {
  showStatsBar: boolean;
  showPageNumbers: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  displayScale: number; // 0.8 to 1.4, default 1.0
  appFont: AccessibilityFont; // Override theme font for entire UI
  editorFont: AccessibilityFont; // Override theme font for screenplay editor
}

export type ToolbarLayout = 'verso' | 'maelle';

export interface LayoutSettings {
  layoutMode: LayoutMode;
  toolbarLayout: ToolbarLayout;
}

export interface ExportSettings {
  defaultFormat: 'pdf' | 'fdx' | 'fountain' | 'txt' | 'html';
  paperSize: 'letter' | 'a4';
}

export interface AppSettings {
  visual: VisualSettings;
  editor: EditorSettings;
  interface: InterfaceSettings;
  layout: LayoutSettings;
  export: ExportSettings;
}

export const defaultSettings: AppSettings = {
  visual: {
    themePreset: 'verso',
    lightColors: {
      // Neutral tones (matches globals.css)
      background: '0 0% 98%',             // Neutral off-white
      foreground: '0 0% 25%',             // Dark gray text
      card: '0 0% 100%',                  // Pure white cards
      cardForeground: '0 0% 15%',
      page: '0 0% 96%',                   // Slightly darker than background
      pageForeground: '0 0% 15%',
      primary: '0 0% 15%',                // Near black
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 95%',
      secondaryForeground: '0 0% 20%',
      muted: '0 0% 95%',
      mutedForeground: '0 0% 40%',        // Medium gray secondary text
      accent: '0 0% 93%',
      accentForeground: '0 0% 15%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 90%',
      input: '0 0% 90%',
      ring: '0 0% 40%',
    },
    darkColors: {
      // Neutral dark tones (matches globals.css)
      background: '0 0% 8%',              // Near black
      foreground: '0 0% 85%',             // Light gray text
      card: '0 0% 10%',
      cardForeground: '0 0% 92%',
      page: '0 0% 10%',                   // Slightly lighter than background
      pageForeground: '0 0% 92%',
      primary: '0 0% 90%',                // Light gray primary
      primaryForeground: '0 0% 10%',
      secondary: '0 0% 15%',
      secondaryForeground: '0 0% 85%',
      muted: '0 0% 15%',
      mutedForeground: '0 0% 60%',        // Medium gray secondary text
      accent: '0 0% 18%',
      accentForeground: '0 0% 90%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 20%',
      input: '0 0% 20%',
      ring: '0 0% 60%',
    },
    lightVisualization: {
      beatColors: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
        '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
      ],
      actColors: {
        act1: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
        act2a: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
        act2b: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)' },
        act3: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)' },
      },
      sceneColors: [
        '#EF4444', '#F97316', '#EAB308', '#22C55E',
        '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
      ],
      characterColors: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
      ],
      locationColors: [
        '#64748B', '#71717A', '#78716C', '#6B7280', '#737373',
        '#A1A1AA', '#A3A3A3', '#9CA3AF', '#94A3B8', '#8B8B8B',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#60A5FA', '#34D399', '#FBBF24', '#F87171',
        '#A78BFA', '#F472B6', '#22D3EE', '#A3E635',
      ],
      actColors: {
        act1: { bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.4)' },
        act2a: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)' },
        act2b: { bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.4)' },
        act3: { bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.4)' },
      },
      sceneColors: [
        '#F87171', '#FB923C', '#FACC15', '#4ADE80',
        '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6',
      ],
      characterColors: [
        '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA',
        '#F472B6', '#22D3EE', '#A3E635', '#FB923C', '#818CF8',
      ],
      locationColors: [
        '#94A3B8', '#A1A1AA', '#A8A29E', '#9CA3AF', '#A3A3A3',
        '#CBD5E1', '#D4D4D8', '#D6D3D1', '#D1D5DB', '#C0C0C0',
      ],
    },
    uiFont: 'inter',
    screenplayFont: 'courier-prime',
    fontSize: 14,
    borderRadius: 12,
    animationSpeed: 0.2,
    cursor: {
      mode: 'native',
      blinkStyle: 'blink',
      blinkSpeed: 530,
      color: null,
      glowEnabled: false,
      glowIntensity: 0.3,
      width: 2,
    },
  },
  editor: {
    autocomplete: {
      enabled: true,
      delayMs: 5000, // 5 second delay by default
    },
    textContrast: 25, // Default lightness percentage
    typewriterMode: false,
    focusLineHighlight: false,
    scrollMode: 'discrete',
    pageStyle: 'themed', // Use theme-colored pages by default
    showSceneNumbers: true, // Show scene numbers next to scene headings
    sceneNumberPosition: 'both', // Industry standard: both margins for shooting scripts
    showPlaceholders: true, // Show ghost text hints in empty elements
    yjsCollaboration: false, // Yjs CRDT collaboration disabled by default
    readingMode: false, // Reading mode - read-only with minimal UI
    showBeginnerTips: false, // Beginner tips disabled by default
  },
  interface: {
    showStatsBar: true,
    showPageNumbers: true,
    reduceMotion: false,
    highContrast: false,
    displayScale: 1.0,
    appFont: 'default',
    editorFont: 'default',
  },
  layout: {
    layoutMode: 'classic',
    toolbarLayout: 'verso',
  },
  export: {
    defaultFormat: 'pdf',
    paperSize: 'letter',
  },
};

export const themePresets: Record<ThemePreset, Partial<VisualSettings>> = {
  // ============================================
  // ESSENTIAL THEMES - Core workspace themes
  // ============================================

  // Verso: Clean neutral grayscale - no color tint
  verso: {
    themePreset: 'verso',
    lightColors: {
      background: '0 0% 99%',             // Pure off-white
      foreground: '0 0% 32%',             // Neutral dark gray
      card: '0 0% 100%',
      cardForeground: '0 0% 32%',
      page: '0 0% 97%',                   // Slightly darker than background
      pageForeground: '0 0% 32%',
      primary: '0 0% 18%',                // Near black
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 96%',              // Light gray
      secondaryForeground: '0 0% 35%',
      muted: '0 0% 96%',
      mutedForeground: '0 0% 50%',
      accent: '0 0% 94%',
      accentForeground: '0 0% 32%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 90%',
      input: '0 0% 90%',
      ring: '0 0% 18%',
    },
    darkColors: {
      background: '0 0% 7%',              // Near black
      foreground: '0 0% 72%',             // Soft gray
      card: '0 0% 9%',
      cardForeground: '0 0% 72%',
      page: '0 0% 9%',                    // Slightly lighter than background
      pageForeground: '0 0% 72%',
      primary: '0 0% 85%',                // Light gray primary
      primaryForeground: '0 0% 9%',
      secondary: '0 0% 13%',
      secondaryForeground: '0 0% 70%',
      muted: '0 0% 13%',
      mutedForeground: '0 0% 48%',
      accent: '0 0% 15%',
      accentForeground: '0 0% 72%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 18%',
      input: '0 0% 18%',
      ring: '0 0% 70%',
    },
    uiFont: 'sf-pro',
    borderRadius: 9,
  },

  // Paper: Monochromatic off-white/cream - classic screenplay aesthetic
  paper: {
    themePreset: 'paper',
    lightColors: {
      background: '45 15% 96%',             // Off-white cream
      foreground: '45 8% 22%',              // Warm brown-gray (monochromatic)
      card: '45 12% 98%',                   // Slightly lighter cream
      cardForeground: '45 8% 22%',
      page: '45 12% 92%',                   // Aged paper (matches muted)
      pageForeground: '45 8% 22%',
      primary: '45 10% 20%',                // Warm dark brown
      primaryForeground: '45 15% 96%',
      secondary: '45 12% 92%',              // Soft cream
      secondaryForeground: '45 8% 28%',
      muted: '45 12% 92%',
      mutedForeground: '45 6% 45%',
      accent: '45 14% 90%',
      accentForeground: '45 8% 22%',
      destructive: '0 50% 50%',
      destructiveForeground: '45 15% 96%',
      border: '45 10% 86%',
      input: '45 10% 86%',
      ring: '45 10% 20%',
    },
    darkColors: {
      background: '45 8% 8%',               // Warm dark brown-black
      foreground: '45 12% 80%',             // Cream text
      card: '45 6% 11%',
      cardForeground: '45 12% 80%',
      page: '45 5% 14%',                    // Aged paper (matches muted)
      pageForeground: '45 12% 80%',
      primary: '45 12% 85%',                // Light cream primary
      primaryForeground: '45 8% 8%',
      secondary: '45 5% 14%',
      secondaryForeground: '45 10% 75%',
      muted: '45 5% 14%',
      mutedForeground: '45 5% 48%',
      accent: '45 6% 16%',
      accentForeground: '45 12% 80%',
      destructive: '0 45% 45%',
      destructiveForeground: '45 12% 90%',
      border: '45 5% 18%',
      input: '45 5% 18%',
      ring: '45 12% 70%',
    },
    uiFont: 'inter',
    borderRadius: 10,
  },

  // Romance: Soft and heartfelt - warm, inviting, gentle on eyes
  romance: {
    themePreset: 'romance',
    lightColors: {
      background: '350 25% 98%',          // Blush white
      foreground: '350 12% 35%',          // Soft mauve
      card: '350 20% 99%',
      cardForeground: '350 12% 35%',
      page: '350 25% 96%',                // Slightly darker blush for paper
      pageForeground: '350 12% 35%',
      primary: '350 50% 55%',             // Dusty rose
      primaryForeground: '0 0% 100%',
      secondary: '350 18% 95%',
      secondaryForeground: '350 10% 38%',
      muted: '350 18% 95%',
      mutedForeground: '350 8% 50%',
      accent: '350 25% 93%',
      accentForeground: '350 12% 35%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '350 15% 90%',
      input: '350 15% 90%',
      ring: '350 50% 55%',
    },
    darkColors: {
      background: '350 20% 10%',          // Deep mauve
      foreground: '350 15% 78%',          // Pink-cream
      card: '350 18% 12%',
      cardForeground: '350 15% 78%',
      page: '350 20% 12%',                // Slightly lighter for paper
      pageForeground: '350 15% 78%',
      primary: '350 45% 58%',             // Rose
      primaryForeground: '350 20% 10%',
      secondary: '350 15% 16%',
      secondaryForeground: '350 12% 72%',
      muted: '350 15% 16%',
      mutedForeground: '350 10% 48%',
      accent: '350 20% 18%',
      accentForeground: '350 15% 78%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '350 12% 20%',
      input: '350 12% 20%',
      ring: '350 45% 58%',
    },
    lightVisualization: {
      beatColors: [
        '#F472B6', '#EC4899', '#DB2777', '#BE185D',
        '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48',
      ],
      actColors: {
        act1: { bg: 'rgba(244, 114, 182, 0.1)', border: 'rgba(244, 114, 182, 0.3)' },
        act2a: { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.3)' },
        act2b: { bg: 'rgba(219, 39, 119, 0.1)', border: 'rgba(219, 39, 119, 0.3)' },
        act3: { bg: 'rgba(190, 24, 93, 0.1)', border: 'rgba(190, 24, 93, 0.3)' },
      },
      sceneColors: [
        '#F472B6', '#EC4899', '#DB2777', '#BE185D',
        '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48',
      ],
      characterColors: [
        '#F472B6', '#EC4899', '#DB2777', '#BE185D', '#FDA4AF',
        '#FB7185', '#F43F5E', '#E11D48', '#C084FC', '#A78BFA',
      ],
      locationColors: [
        '#FDA4AF', '#FECDD3', '#FCE7F3', '#FDF2F8', '#F9A8D4',
        '#F0ABFC', '#E9D5FF', '#DDD6FE', '#C4B5FD', '#A78BFA',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#F9A8D4', '#F472B6', '#EC4899', '#DB2777',
        '#FBCFE8', '#FDA4AF', '#FB7185', '#F43F5E',
      ],
      actColors: {
        act1: { bg: 'rgba(249, 168, 212, 0.15)', border: 'rgba(249, 168, 212, 0.4)' },
        act2a: { bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.4)' },
        act2b: { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.4)' },
        act3: { bg: 'rgba(219, 39, 119, 0.15)', border: 'rgba(219, 39, 119, 0.4)' },
      },
      sceneColors: [
        '#F9A8D4', '#F472B6', '#EC4899', '#DB2777',
        '#FBCFE8', '#FDA4AF', '#FB7185', '#F43F5E',
      ],
      characterColors: [
        '#F9A8D4', '#F472B6', '#EC4899', '#DB2777', '#FBCFE8',
        '#FDA4AF', '#FB7185', '#F43F5E', '#D8B4FE', '#C4B5FD',
      ],
      locationColors: [
        '#FBCFE8', '#FCE7F3', '#FDF2F8', '#FFF1F2', '#FECDD3',
        '#F5D0FE', '#FAE8FF', '#F3E8FF', '#EDE9FE', '#DDD6FE',
      ],
    },
    uiFont: 'inter',
    borderRadius: 16,
  },

  // ============================================
  // VINTAGE THEMES - Retro cultural aesthetics
  // ============================================

  // Matcha: Soft sage and stone - muted Chinese retro
  matcha: {
    themePreset: 'matcha',
    lightColors: {
      background: '80 8% 96%',              // Very soft gray with sage hint
      foreground: '80 5% 32%',              // Soft gray-green text
      card: '80 6% 98%',                    // Nearly white cards
      cardForeground: '80 5% 32%',
      page: '80 8% 94%',                    // Slightly darker sage for paper
      pageForeground: '80 5% 32%',
      primary: '80 18% 45%',                // Muted sage green
      primaryForeground: '0 0% 100%',
      secondary: '80 6% 93%',               // Light stone gray
      secondaryForeground: '80 5% 38%',
      muted: '80 6% 93%',
      mutedForeground: '80 4% 52%',
      accent: '80 10% 90%',                 // Subtle sage tint
      accentForeground: '80 5% 32%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '80 6% 88%',
      input: '80 6% 88%',
      ring: '80 18% 45%',
    },
    darkColors: {
      background: '80 6% 9%',               // Deep gray with sage undertone
      foreground: '80 8% 75%',              // Soft sage-gray text
      card: '80 5% 12%',
      cardForeground: '80 8% 75%',
      page: '80 6% 11%',                    // Slightly lighter sage for paper
      pageForeground: '80 8% 75%',
      primary: '80 22% 52%',                // Brighter muted sage
      primaryForeground: '80 6% 9%',
      secondary: '80 5% 15%',
      secondaryForeground: '80 6% 68%',
      muted: '80 5% 15%',
      mutedForeground: '80 4% 48%',
      accent: '80 8% 18%',                  // Dark sage accent
      accentForeground: '80 8% 75%',
      destructive: '0 50% 45%',
      destructiveForeground: '0 0% 100%',
      border: '80 5% 18%',
      input: '80 5% 18%',
      ring: '80 22% 52%',
    },
    lightVisualization: {
      beatColors: [
        '#8a9a7a', '#9cac8c', '#aebda0', '#c1cfb4',
        '#788868', '#687858', '#586848', '#d4e0c8',
      ],
      actColors: {
        act1: { bg: 'rgba(138, 154, 122, 0.1)', border: 'rgba(138, 154, 122, 0.25)' },
        act2a: { bg: 'rgba(120, 136, 104, 0.1)', border: 'rgba(120, 136, 104, 0.25)' },
        act2b: { bg: 'rgba(104, 120, 88, 0.1)', border: 'rgba(104, 120, 88, 0.25)' },
        act3: { bg: 'rgba(156, 172, 140, 0.1)', border: 'rgba(156, 172, 140, 0.25)' },
      },
      sceneColors: [
        '#8a9a7a', '#9cac8c', '#788868', '#687858',
        '#aebda0', '#c1cfb4', '#586848', '#d4e0c8',
      ],
      characterColors: [
        '#8a9a7a', '#788868', '#9cac8c', '#687858', '#aebda0',
        '#586848', '#c1cfb4', '#4a5a3a', '#d4e0c8', '#b8c8a8',
      ],
      locationColors: [
        '#788868', '#687858', '#586848', '#4a5a3a', '#8a9a7a',
        '#9cac8c', '#aebda0', '#c1cfb4', '#d4e0c8', '#b8c8a8',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#9cac8c', '#8a9a7a', '#788868', '#687858',
        '#aebda0', '#c1cfb4', '#d4e0c8', '#b8c8a8',
      ],
      actColors: {
        act1: { bg: 'rgba(156, 172, 140, 0.12)', border: 'rgba(156, 172, 140, 0.3)' },
        act2a: { bg: 'rgba(138, 154, 122, 0.12)', border: 'rgba(138, 154, 122, 0.3)' },
        act2b: { bg: 'rgba(120, 136, 104, 0.12)', border: 'rgba(120, 136, 104, 0.3)' },
        act3: { bg: 'rgba(174, 189, 160, 0.12)', border: 'rgba(174, 189, 160, 0.3)' },
      },
      sceneColors: [
        '#9cac8c', '#8a9a7a', '#aebda0', '#788868',
        '#c1cfb4', '#687858', '#d4e0c8', '#b8c8a8',
      ],
      characterColors: [
        '#9cac8c', '#aebda0', '#8a9a7a', '#c1cfb4', '#788868',
        '#d4e0c8', '#687858', '#b8c8a8', '#586848', '#e0ecd4',
      ],
      locationColors: [
        '#687858', '#788868', '#8a9a7a', '#9cac8c', '#586848',
        '#aebda0', '#c1cfb4', '#d4e0c8', '#b8c8a8', '#e0ecd4',
      ],
    },
    uiFont: 'inter',
    borderRadius: 10,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 530,
      color: '80 18% 45%',  // Muted sage cursor
      glowEnabled: false,
      glowIntensity: 0.3,
      width: 2,
    },
  },

  // Neovictorian: Soft charcoal and muted gold - European vintage
  neovictorian: {
    themePreset: 'neovictorian',
    lightColors: {
      background: '30 6% 96%',              // Soft warm gray
      foreground: '30 4% 30%',              // Muted charcoal text
      card: '30 5% 98%',                    // Nearly white cards
      cardForeground: '30 4% 30%',
      page: '30 6% 94%',                    // Slightly darker warm gray for paper
      pageForeground: '30 4% 30%',
      primary: '38 18% 50%',                // Soft antique gold
      primaryForeground: '0 0% 100%',
      secondary: '30 5% 92%',               // Light warm gray
      secondaryForeground: '30 4% 36%',
      muted: '30 5% 92%',
      mutedForeground: '30 3% 52%',
      accent: '38 12% 88%',                 // Subtle gold tint
      accentForeground: '30 4% 30%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '30 5% 86%',
      input: '30 5% 86%',
      ring: '38 18% 50%',
    },
    darkColors: {
      background: '30 5% 9%',               // Deep warm charcoal
      foreground: '30 6% 75%',              // Soft warm gray text
      card: '30 4% 12%',
      cardForeground: '30 6% 75%',
      page: '30 5% 11%',                    // Slightly lighter warm gray for paper
      pageForeground: '30 6% 75%',
      primary: '38 22% 55%',                // Brighter soft gold
      primaryForeground: '30 5% 9%',
      secondary: '30 4% 15%',
      secondaryForeground: '30 5% 68%',
      muted: '30 4% 15%',
      mutedForeground: '30 3% 48%',
      accent: '38 10% 18%',                 // Dark gold accent
      accentForeground: '30 6% 75%',
      destructive: '0 50% 45%',
      destructiveForeground: '0 0% 100%',
      border: '30 4% 18%',
      input: '30 4% 18%',
      ring: '38 22% 55%',
    },
    lightVisualization: {
      beatColors: [
        '#06B6D4', '#0891B2', '#0E7490', '#155E75',
        '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
      ],
      actColors: {
        act1: { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)' },
        act2a: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
        act2b: { bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.3)' },
        act3: { bg: 'rgba(14, 116, 144, 0.1)', border: 'rgba(14, 116, 144, 0.3)' },
      },
      sceneColors: [
        '#06B6D4', '#0891B2', '#0E7490', '#155E75',
        '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
      ],
      characterColors: [
        '#06B6D4', '#0891B2', '#3B82F6', '#2563EB', '#0E7490',
        '#1D4ED8', '#155E75', '#1E40AF', '#0C4A6E', '#164E63',
      ],
      locationColors: [
        '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9', '#64748B',
        '#CFFAFE', '#A5F3FC', '#67E8F9', '#22D3EE', '#06B6D4',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#22D3EE', '#06B6D4', '#0891B2', '#0E7490',
        '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8',
      ],
      actColors: {
        act1: { bg: 'rgba(34, 211, 238, 0.15)', border: 'rgba(34, 211, 238, 0.4)' },
        act2a: { bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.4)' },
        act2b: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)' },
        act3: { bg: 'rgba(8, 145, 178, 0.15)', border: 'rgba(8, 145, 178, 0.4)' },
      },
      sceneColors: [
        '#22D3EE', '#06B6D4', '#0891B2', '#0E7490',
        '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8',
      ],
      characterColors: [
        '#22D3EE', '#06B6D4', '#60A5FA', '#3B82F6', '#0891B2',
        '#2563EB', '#0E7490', '#1D4ED8', '#155E75', '#1E40AF',
      ],
      locationColors: [
        '#CBD5E1', '#E2E8F0', '#F1F5F9', '#F8FAFC', '#94A3B8',
        '#ECFEFF', '#CFFAFE', '#A5F3FC', '#67E8F9', '#22D3EE',
      ],
    },
    uiFont: 'geist',
    borderRadius: 6,
    cursor: {
      mode: 'native',
      blinkStyle: 'smooth',
      blinkSpeed: 530,
      color: '195 70% 52%',  // Cyan to match theme
      glowEnabled: true,
      glowIntensity: 0.4,
      width: 2,
    },
  },

  // Horror: Desaturated gothic with blood red accents
  horror: {
    themePreset: 'horror',
    lightColors: {
      background: '0 3% 94%',             // Desaturated cool gray
      foreground: '0 5% 20%',             // Dark desaturated
      card: '0 2% 96%',
      cardForeground: '0 5% 20%',
      page: '0 3% 92%',                   // Slightly darker gray for paper
      pageForeground: '0 5% 20%',
      primary: '0 65% 45%',               // Blood red
      primaryForeground: '0 0% 98%',
      secondary: '0 3% 90%',
      secondaryForeground: '0 5% 25%',
      muted: '0 3% 90%',
      mutedForeground: '0 3% 45%',
      accent: '0 5% 88%',                 // Faint gray
      accentForeground: '0 5% 20%',
      destructive: '0 65% 45%',
      destructiveForeground: '0 0% 98%',
      border: '0 3% 85%',
      input: '0 3% 85%',
      ring: '0 65% 45%',
    },
    darkColors: {
      background: '0 5% 6%',              // Deep desaturated black
      foreground: '0 5% 75%',             // Pale gray
      card: '0 4% 9%',
      cardForeground: '0 5% 75%',
      page: '0 5% 8%',                    // Slightly lighter gray for paper
      pageForeground: '0 5% 75%',
      primary: '0 70% 50%',               // Blood red
      primaryForeground: '0 0% 98%',
      secondary: '0 4% 12%',
      secondaryForeground: '0 5% 68%',
      muted: '0 4% 12%',
      mutedForeground: '0 4% 45%',
      accent: '0 6% 14%',                 // Dark gray
      accentForeground: '0 5% 75%',
      destructive: '0 70% 50%',
      destructiveForeground: '0 0% 98%',
      border: '0 4% 16%',
      input: '0 4% 16%',
      ring: '0 70% 50%',
    },
    lightVisualization: {
      beatColors: [
        '#92713A', '#A67C3D', '#B8894A', '#C9995A',
        '#3D3530', '#4A423C', '#574F48', '#655C54',
      ],
      actColors: {
        act1: { bg: 'rgba(146, 113, 58, 0.1)', border: 'rgba(146, 113, 58, 0.3)' },
        act2a: { bg: 'rgba(61, 53, 48, 0.1)', border: 'rgba(61, 53, 48, 0.3)' },
        act2b: { bg: 'rgba(74, 66, 60, 0.1)', border: 'rgba(74, 66, 60, 0.3)' },
        act3: { bg: 'rgba(166, 124, 61, 0.1)', border: 'rgba(166, 124, 61, 0.3)' },
      },
      sceneColors: [
        '#92713A', '#A67C3D', '#B8894A', '#3D3530',
        '#4A423C', '#574F48', '#7A6230', '#655C54',
      ],
      characterColors: [
        '#92713A', '#3D3530', '#A67C3D', '#4A423C', '#B8894A',
        '#574F48', '#7A6230', '#655C54', '#5C4A28', '#787068',
      ],
      locationColors: [
        '#574F48', '#655C54', '#787068', '#8A827A', '#4A423C',
        '#C9995A', '#B8894A', '#A67C3D', '#92713A', '#7A6230',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#D4A84B', '#C9995A', '#B8894A', '#A67C3D',
        '#A89A8C', '#968878', '#847668', '#726458',
      ],
      actColors: {
        act1: { bg: 'rgba(212, 168, 75, 0.15)', border: 'rgba(212, 168, 75, 0.4)' },
        act2a: { bg: 'rgba(168, 154, 140, 0.12)', border: 'rgba(168, 154, 140, 0.35)' },
        act2b: { bg: 'rgba(150, 136, 120, 0.12)', border: 'rgba(150, 136, 120, 0.35)' },
        act3: { bg: 'rgba(201, 153, 90, 0.15)', border: 'rgba(201, 153, 90, 0.4)' },
      },
      sceneColors: [
        '#D4A84B', '#C9995A', '#B8894A', '#A89A8C',
        '#968878', '#847668', '#E0B860', '#A67C3D',
      ],
      characterColors: [
        '#D4A84B', '#A89A8C', '#C9995A', '#968878', '#B8894A',
        '#847668', '#E0B860', '#726458', '#A67C3D', '#BAB0A6',
      ],
      locationColors: [
        '#847668', '#968878', '#A89A8C', '#BAB0A6', '#726458',
        '#E0B860', '#D4A84B', '#C9995A', '#B8894A', '#A67C3D',
      ],
    },
    uiFont: 'geist',
    borderRadius: 4,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 600,
      color: '38 55% 50%',  // Amber lantern glow
      glowEnabled: true,
      glowIntensity: 0.4,
      width: 2,
    },
  },

  // ============================================
  // PREMIUM THEMES - Immersive visual experiences
  // ============================================

  // Mission Control: NASA/Nothing inspired - industrial precision, dot-matrix, monochromatic with red accent
  'mission-control': {
    themePreset: 'mission-control',
    lightColors: {
      background: '40 10% 95%',         // Clean off-white, slight warmth
      foreground: '0 0% 10%',           // Near-black text
      card: '40 8% 97%',                // Slightly lighter card
      cardForeground: '0 0% 10%',
      page: '40 6% 93%',                // Subtle warm paper
      pageForeground: '0 0% 8%',
      primary: '7 90% 62%',             // Nothing Coral (slightly toned)
      primaryForeground: '0 0% 100%',
      secondary: '40 5% 88%',           // Neutral light gray
      secondaryForeground: '0 0% 15%',
      muted: '40 6% 90%',               // Soft neutral
      mutedForeground: '0 0% 40%',
      accent: '40 5% 85%',              // Neutral accent
      accentForeground: '0 0% 10%',
      destructive: '0 70% 50%',
      destructiveForeground: '0 0% 100%',
      border: '40 5% 82%',              // Subtle neutral border
      input: '40 5% 85%',
      ring: '7 90% 62%',                // Coral focus ring
    },
    darkColors: {
      background: '0 0% 7%',            // Deep dark
      foreground: '0 0% 90%',           // Crisp white text
      card: '0 0% 10%',                 // Panel dark gray
      cardForeground: '0 0% 90%',
      page: '0 0% 9%',                  // Document dark
      pageForeground: '0 0% 88%',
      primary: '7 80% 62%',             // Nothing Coral (main actions)
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 14%',            // Dark gray
      secondaryForeground: '0 0% 82%',
      muted: '0 0% 12%',                // Subtle dark
      mutedForeground: '0 0% 52%',
      accent: '0 0% 18%',               // Monochromatic accent
      accentForeground: '0 0% 90%',
      destructive: '0 70% 55%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 18%',               // Subtle dark borders
      input: '0 0% 16%',
      ring: '7 80% 62%',                // Coral focus ring
    },
    lightVisualization: {
      // Monochromatic grays with Nothing Coral accent
      beatColors: [
        '#E8634F', '#2A2A2A', '#4A4A4A', '#6A6A6A',
        '#8A8A8A', '#9A9A9A', '#AAAAAA', '#BABABA',
      ],
      actColors: {
        act1: { bg: 'rgba(42, 42, 42, 0.05)', border: 'rgba(42, 42, 42, 0.15)' },
        act2a: { bg: 'rgba(74, 74, 74, 0.05)', border: 'rgba(74, 74, 74, 0.15)' },
        act2b: { bg: 'rgba(106, 106, 106, 0.05)', border: 'rgba(106, 106, 106, 0.15)' },
        act3: { bg: 'rgba(232, 99, 79, 0.08)', border: 'rgba(232, 99, 79, 0.2)' },
      },
      sceneColors: [
        '#E8634F', '#2A2A2A', '#4A4A4A', '#6A6A6A',
        '#8A8A8A', '#9A9A9A', '#AAAAAA', '#BABABA',
      ],
      characterColors: [
        '#E8634F', '#2A2A2A', '#3A3A3A', '#5A5A5A', '#7A7A7A',
        '#8A8A8A', '#9A9A9A', '#AAAAAA', '#BABABA', '#CACACA',
      ],
      locationColors: [
        '#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A', '#8A8A8A',
        '#9A9A9A', '#AAAAAA', '#BABABA', '#CACACA', '#DADADA',
      ],
    },
    darkVisualization: {
      // Monochromatic grays with Nothing Coral accent
      beatColors: [
        '#F0856E', '#E8E8E8', '#D0D0D0', '#B8B8B8',
        '#A0A0A0', '#888888', '#707070', '#585858',
      ],
      actColors: {
        act1: { bg: 'rgba(232, 232, 232, 0.06)', border: 'rgba(232, 232, 232, 0.18)' },
        act2a: { bg: 'rgba(208, 208, 208, 0.06)', border: 'rgba(208, 208, 208, 0.18)' },
        act2b: { bg: 'rgba(184, 184, 184, 0.06)', border: 'rgba(184, 184, 184, 0.18)' },
        act3: { bg: 'rgba(240, 133, 110, 0.1)', border: 'rgba(240, 133, 110, 0.25)' },
      },
      sceneColors: [
        '#F0856E', '#E8E8E8', '#D0D0D0', '#B8B8B8',
        '#A0A0A0', '#888888', '#707070', '#585858',
      ],
      characterColors: [
        '#F0856E', '#E8E8E8', '#D8D8D8', '#C8C8C8', '#B8B8B8',
        '#A8A8A8', '#989898', '#888888', '#787878', '#686868',
      ],
      locationColors: [
        '#B8B8B8', '#A8A8A8', '#989898', '#888888', '#787878',
        '#686868', '#585858', '#484848', '#383838', '#282828',
      ],
    },
    uiFont: 'oxanium',
    borderRadius: 2,                    // Sharp, industrial corners
    animationSpeed: 0.15,               // Quick, precise animations
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 600,
      color: '7 80% 58%',               // Nothing Coral cursor
      glowEnabled: true,
      glowIntensity: 0.3,
      width: 2,
    },
    premium: {
      backgroundPattern: 'dot-matrix',
      patternOpacity: 0.06,
      pageChrome: 'registration-marks',
      chromeOpacity: 0.25,
      ambientEffect: 'none',
      ambientIntensity: 0,
      uiChrome: 'brutalist',
    },
  },

  // Cyberpunk: Neon retrofuture, pink/cyan, grid floor, scanlines
  cyberpunk: {
    themePreset: 'cyberpunk',
    lightColors: {
      background: '220 25% 96%',        // Cool bluish-gray
      foreground: '280 80% 25%',        // Deep purple text
      card: '220 20% 98%',
      cardForeground: '280 80% 25%',
      page: '220 15% 94%',              // Cool paper
      pageForeground: '280 80% 25%',
      primary: '320 100% 50%',          // Hot pink
      primaryForeground: '0 0% 100%',
      secondary: '185 80% 92%',         // Pale cyan
      secondaryForeground: '280 50% 30%',
      muted: '220 15% 92%',
      mutedForeground: '280 30% 45%',
      accent: '185 100% 40%',           // Cyan accent
      accentForeground: '0 0% 100%',
      destructive: '0 70% 55%',
      destructiveForeground: '0 0% 100%',
      border: '280 20% 85%',
      input: '280 20% 85%',
      ring: '320 100% 50%',
    },
    darkColors: {
      background: '260 30% 6%',         // Deep purple-black
      foreground: '185 100% 70%',       // Bright cyan text
      card: '260 25% 10%',
      cardForeground: '185 100% 70%',
      page: '260 20% 12%',              // Dark purple paper
      pageForeground: '185 90% 65%',
      primary: '320 100% 60%',          // Neon pink
      primaryForeground: '260 30% 6%',
      secondary: '260 30% 18%',
      secondaryForeground: '185 80% 60%',
      muted: '260 25% 14%',
      mutedForeground: '185 60% 50%',
      accent: '185 100% 45%',           // Electric cyan
      accentForeground: '260 30% 6%',
      destructive: '0 75% 55%',
      destructiveForeground: '0 0% 100%',
      border: '280 40% 25%',
      input: '280 30% 20%',
      ring: '320 100% 55%',
    },
    lightVisualization: {
      beatColors: [
        '#FF1493', '#FF00FF', '#00FFFF', '#00FF7F',
        '#FF6B6B', '#9B59B6', '#3498DB', '#1ABC9C',
      ],
      actColors: {
        act1: { bg: 'rgba(255, 20, 147, 0.1)', border: 'rgba(255, 20, 147, 0.4)' },
        act2a: { bg: 'rgba(0, 255, 255, 0.1)', border: 'rgba(0, 255, 255, 0.4)' },
        act2b: { bg: 'rgba(138, 43, 226, 0.1)', border: 'rgba(138, 43, 226, 0.4)' },
        act3: { bg: 'rgba(0, 255, 127, 0.1)', border: 'rgba(0, 255, 127, 0.4)' },
      },
      sceneColors: [
        '#FF1493', '#00FFFF', '#FF00FF', '#00FF7F',
        '#9B59B6', '#3498DB', '#FF6B6B', '#1ABC9C',
      ],
      characterColors: [
        '#FF1493', '#00FFFF', '#FF00FF', '#00FF7F', '#9B59B6',
        '#3498DB', '#FF6B6B', '#1ABC9C', '#E91E63', '#00BCD4',
      ],
      locationColors: [
        '#9B59B6', '#8E44AD', '#7D3C98', '#6C3483', '#5B2C6F',
        '#3498DB', '#2980B9', '#2471A3', '#1F618D', '#1A5276',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#FF69B4', '#FF00FF', '#00FFFF', '#00FF7F',
        '#FF8C8C', '#B370CF', '#5DADE2', '#48C9B0',
      ],
      actColors: {
        act1: { bg: 'rgba(255, 105, 180, 0.15)', border: 'rgba(255, 105, 180, 0.5)' },
        act2a: { bg: 'rgba(0, 255, 255, 0.15)', border: 'rgba(0, 255, 255, 0.5)' },
        act2b: { bg: 'rgba(179, 112, 207, 0.15)', border: 'rgba(179, 112, 207, 0.5)' },
        act3: { bg: 'rgba(0, 255, 127, 0.15)', border: 'rgba(0, 255, 127, 0.5)' },
      },
      sceneColors: [
        '#FF69B4', '#00FFFF', '#FF00FF', '#00FF7F',
        '#B370CF', '#5DADE2', '#FF8C8C', '#48C9B0',
      ],
      characterColors: [
        '#FF69B4', '#00FFFF', '#FF00FF', '#00FF7F', '#B370CF',
        '#5DADE2', '#FF8C8C', '#48C9B0', '#F48FB1', '#4DD0E1',
      ],
      locationColors: [
        '#B370CF', '#A569BD', '#9B59B6', '#8E44AD', '#7D3C98',
        '#5DADE2', '#3498DB', '#2980B9', '#2471A3', '#1F618D',
      ],
    },
    uiFont: 'geist',
    borderRadius: 4,                    // Slightly rounded but angular
    animationSpeed: 0.15,               // Fast, techy
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 450,                  // Fast, techy blink
      color: '185 100% 50%',            // Cyan cursor
      glowEnabled: true,
      glowIntensity: 0.6,               // Strong neon glow
      width: 2,
    },
    premium: {
      backgroundPattern: 'blueprint-grid',
      patternOpacity: 0.04,
      patternColor: '185 100% 50%',     // Cyan tint
      pageChrome: 'none',
      chromeOpacity: 0,
      ambientEffect: 'neon-glow',
      ambientIntensity: 0.3,
      uiChrome: 'glassmorphic',
    },
  },

  // Typewriter: Classic mechanical typewriter aesthetic
  typewriter: {
    themePreset: 'typewriter',
    lightColors: {
      background: '40 12% 95%',           // Aged paper
      foreground: '0 0% 15%',             // Ink black
      card: '40 10% 97%',
      cardForeground: '0 0% 15%',
      page: '40 15% 92%',                 // Yellowed paper
      pageForeground: '0 0% 12%',
      primary: '0 0% 12%',                // Typewriter key black
      primaryForeground: '40 12% 95%',
      secondary: '40 8% 90%',
      secondaryForeground: '0 0% 20%',
      muted: '40 10% 88%',
      mutedForeground: '0 0% 45%',
      accent: '25 60% 45%',               // Vintage red ribbon
      accentForeground: '0 0% 100%',
      destructive: '0 65% 50%',
      destructiveForeground: '0 0% 100%',
      border: '40 8% 82%',
      input: '40 8% 85%',
      ring: '0 0% 20%',
    },
    darkColors: {
      background: '40 8% 8%',             // Dark mahogany desk
      foreground: '40 15% 82%',           // Cream paper text
      card: '40 6% 11%',
      cardForeground: '40 15% 82%',
      page: '40 10% 12%',
      pageForeground: '40 12% 78%',
      primary: '40 15% 85%',
      primaryForeground: '40 8% 8%',
      secondary: '40 6% 15%',
      secondaryForeground: '40 12% 75%',
      muted: '40 5% 14%',
      mutedForeground: '40 8% 50%',
      accent: '25 50% 50%',               // Vintage red
      accentForeground: '0 0% 100%',
      destructive: '0 55% 45%',
      destructiveForeground: '0 0% 100%',
      border: '40 5% 18%',
      input: '40 5% 16%',
      ring: '40 15% 70%',
    },
    uiFont: 'ibm-plex',
    borderRadius: 4,
    animationSpeed: 0.2,
    cursor: {
      mode: 'block',
      blinkStyle: 'blink',
      blinkSpeed: 530,
      color: null,
      glowEnabled: false,
      glowIntensity: 0,
      width: 2,
    },
  },

  // Screenplay Classic: Hollywood golden age
  'screenplay-classic': {
    themePreset: 'screenplay-classic',
    lightColors: {
      background: '0 0% 97%',             // Clean white
      foreground: '0 0% 12%',             // Black text
      card: '0 0% 100%',
      cardForeground: '0 0% 12%',
      page: '0 0% 100%',                  // Pure white page
      pageForeground: '0 0% 8%',
      primary: '0 0% 10%',                // Classic black
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 94%',
      secondaryForeground: '0 0% 15%',
      muted: '0 0% 95%',
      mutedForeground: '0 0% 45%',
      accent: '210 15% 50%',              // Subtle blue
      accentForeground: '0 0% 100%',
      destructive: '0 65% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 88%',
      input: '0 0% 88%',
      ring: '210 15% 50%',
    },
    darkColors: {
      background: '0 0% 6%',
      foreground: '0 0% 88%',
      card: '0 0% 8%',
      cardForeground: '0 0% 88%',
      page: '0 0% 10%',
      pageForeground: '0 0% 85%',
      primary: '0 0% 92%',
      primaryForeground: '0 0% 6%',
      secondary: '0 0% 14%',
      secondaryForeground: '0 0% 82%',
      muted: '0 0% 12%',
      mutedForeground: '0 0% 55%',
      accent: '210 20% 55%',
      accentForeground: '0 0% 100%',
      destructive: '0 55% 45%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 18%',
      input: '0 0% 15%',
      ring: '210 20% 55%',
    },
    uiFont: 'inter',
    borderRadius: 8,
    animationSpeed: 0.2,
  },

  // Sepia: Warm vintage tones
  sepia: {
    themePreset: 'sepia',
    lightColors: {
      background: '35 25% 94%',           // Warm sepia base
      foreground: '30 30% 20%',           // Brown text
      card: '35 20% 97%',
      cardForeground: '30 30% 20%',
      page: '38 30% 90%',                 // Aged sepia paper
      pageForeground: '30 35% 18%',
      primary: '30 40% 35%',              // Deep brown
      primaryForeground: '35 25% 95%',
      secondary: '35 18% 88%',
      secondaryForeground: '30 25% 28%',
      muted: '35 20% 86%',
      mutedForeground: '30 15% 45%',
      accent: '28 50% 50%',               // Burnt orange
      accentForeground: '0 0% 100%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '35 15% 78%',
      input: '35 15% 80%',
      ring: '30 40% 40%',
    },
    darkColors: {
      background: '30 15% 8%',
      foreground: '35 20% 80%',
      card: '30 12% 11%',
      cardForeground: '35 20% 80%',
      page: '32 18% 13%',
      pageForeground: '35 18% 75%',
      primary: '35 30% 65%',
      primaryForeground: '30 15% 8%',
      secondary: '30 10% 16%',
      secondaryForeground: '35 15% 72%',
      muted: '30 8% 14%',
      mutedForeground: '35 12% 50%',
      accent: '28 45% 55%',
      accentForeground: '0 0% 100%',
      destructive: '0 50% 45%',
      destructiveForeground: '0 0% 100%',
      border: '30 8% 20%',
      input: '30 8% 18%',
      ring: '35 30% 60%',
    },
    uiFont: 'plus-jakarta',
    borderRadius: 10,
    animationSpeed: 0.25,
  },

  // Midnight: Deep night writing
  midnight: {
    themePreset: 'midnight',
    lightColors: {
      background: '220 20% 96%',          // Cool gray
      foreground: '220 25% 20%',          // Dark blue-gray
      card: '220 15% 98%',
      cardForeground: '220 25% 20%',
      page: '220 18% 94%',
      pageForeground: '220 30% 18%',
      primary: '220 60% 50%',             // Deep blue
      primaryForeground: '0 0% 100%',
      secondary: '220 12% 90%',
      secondaryForeground: '220 20% 25%',
      muted: '220 15% 92%',
      mutedForeground: '220 15% 45%',
      accent: '250 50% 55%',              // Purple accent
      accentForeground: '0 0% 100%',
      destructive: '0 65% 50%',
      destructiveForeground: '0 0% 100%',
      border: '220 12% 85%',
      input: '220 12% 85%',
      ring: '220 60% 50%',
    },
    darkColors: {
      background: '225 35% 6%',           // Deep midnight blue
      foreground: '220 20% 82%',          // Soft blue-white
      card: '225 30% 10%',
      cardForeground: '220 20% 82%',
      page: '225 28% 12%',
      pageForeground: '220 18% 78%',
      primary: '220 70% 60%',             // Bright blue
      primaryForeground: '225 35% 6%',
      secondary: '225 25% 16%',
      secondaryForeground: '220 15% 75%',
      muted: '225 20% 14%',
      mutedForeground: '220 15% 50%',
      accent: '250 55% 60%',              // Soft purple
      accentForeground: '0 0% 100%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '225 20% 20%',
      input: '225 20% 18%',
      ring: '220 70% 55%',
    },
    uiFont: 'geist',
    borderRadius: 8,
    animationSpeed: 0.2,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 600,
      color: '220 70% 55%',               // Blue cursor
      glowEnabled: true,
      glowIntensity: 0.25,
      width: 2,
    },
  },

  // Studio: Professional workspace
  studio: {
    themePreset: 'studio',
    lightColors: {
      background: '0 0% 96%',             // Clean neutral
      foreground: '0 0% 18%',
      card: '0 0% 100%',
      cardForeground: '0 0% 18%',
      page: '0 0% 98%',
      pageForeground: '0 0% 15%',
      primary: '215 80% 50%',             // Professional blue
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 92%',
      secondaryForeground: '0 0% 22%',
      muted: '0 0% 94%',
      mutedForeground: '0 0% 45%',
      accent: '215 70% 55%',
      accentForeground: '0 0% 100%',
      destructive: '0 70% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 88%',
      input: '0 0% 88%',
      ring: '215 80% 50%',
    },
    darkColors: {
      background: '0 0% 7%',
      foreground: '0 0% 88%',
      card: '0 0% 10%',
      cardForeground: '0 0% 88%',
      page: '0 0% 9%',
      pageForeground: '0 0% 85%',
      primary: '215 75% 55%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 14%',
      secondaryForeground: '0 0% 82%',
      muted: '0 0% 12%',
      mutedForeground: '0 0% 55%',
      accent: '215 65% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 60% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 18%',
      input: '0 0% 15%',
      ring: '215 75% 55%',
    },
    uiFont: 'sf-pro',
    borderRadius: 10,
    animationSpeed: 0.15,
  },

  // Belle Époque: Parisian elegance
  'belle-epoque': {
    themePreset: 'belle-epoque',
    lightColors: {
      background: '45 18% 96%',           // Warm cream
      foreground: '280 15% 22%',          // Deep plum
      card: '45 15% 98%',
      cardForeground: '280 15% 22%',
      page: '48 20% 94%',                 // Champagne paper
      pageForeground: '280 18% 20%',
      primary: '280 35% 40%',             // Art nouveau purple
      primaryForeground: '45 18% 96%',
      secondary: '45 12% 90%',
      secondaryForeground: '280 12% 28%',
      muted: '45 15% 88%',
      mutedForeground: '280 8% 45%',
      accent: '35 70% 50%',               // Gold accent
      accentForeground: '280 35% 15%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '45 12% 82%',
      input: '45 12% 84%',
      ring: '280 35% 40%',
    },
    darkColors: {
      background: '280 20% 7%',           // Deep plum
      foreground: '45 20% 82%',           // Warm cream text
      card: '280 18% 10%',
      cardForeground: '45 20% 82%',
      page: '280 15% 12%',
      pageForeground: '45 18% 78%',
      primary: '35 65% 55%',              // Gold
      primaryForeground: '280 20% 7%',
      secondary: '280 15% 15%',
      secondaryForeground: '45 15% 75%',
      muted: '280 12% 13%',
      mutedForeground: '45 10% 50%',
      accent: '280 40% 55%',              // Soft purple
      accentForeground: '0 0% 100%',
      destructive: '0 50% 45%',
      destructiveForeground: '0 0% 100%',
      border: '280 12% 18%',
      input: '280 12% 16%',
      ring: '35 65% 55%',
    },
    uiFont: 'plus-jakarta',
    borderRadius: 12,
    animationSpeed: 0.25,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 550,
      color: '35 65% 50%',                // Gold cursor
      glowEnabled: true,
      glowIntensity: 0.3,
      width: 2,
    },
  },

  // Faerûn: Fantasy adventure
  faerun: {
    themePreset: 'faerun',
    lightColors: {
      background: '25 15% 95%',           // Parchment base
      foreground: '25 25% 18%',           // Dark brown ink
      card: '25 12% 97%',
      cardForeground: '25 25% 18%',
      page: '30 20% 91%',                 // Aged scroll
      pageForeground: '25 30% 15%',
      primary: '140 40% 35%',             // Forest green
      primaryForeground: '0 0% 100%',
      secondary: '25 10% 88%',
      secondaryForeground: '25 20% 25%',
      muted: '25 12% 86%',
      mutedForeground: '25 12% 45%',
      accent: '35 70% 50%',               // Gold treasure
      accentForeground: '25 30% 15%',
      destructive: '0 60% 50%',
      destructiveForeground: '0 0% 100%',
      border: '25 10% 80%',
      input: '25 10% 82%',
      ring: '140 40% 35%',
    },
    darkColors: {
      background: '25 18% 7%',            // Dark dungeon
      foreground: '35 25% 80%',           // Warm parchment text
      card: '25 15% 10%',
      cardForeground: '35 25% 80%',
      page: '28 20% 12%',
      pageForeground: '35 22% 75%',
      primary: '140 45% 45%',             // Emerald
      primaryForeground: '0 0% 100%',
      secondary: '25 12% 15%',
      secondaryForeground: '35 18% 72%',
      muted: '25 10% 13%',
      mutedForeground: '35 12% 50%',
      accent: '35 65% 55%',               // Glowing gold
      accentForeground: '25 18% 7%',
      destructive: '0 55% 45%',
      destructiveForeground: '0 0% 100%',
      border: '25 10% 18%',
      input: '25 10% 16%',
      ring: '140 45% 45%',
    },
    uiFont: 'plus-jakarta',
    borderRadius: 8,
    animationSpeed: 0.2,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 500,
      color: '35 60% 50%',                // Golden cursor
      glowEnabled: true,
      glowIntensity: 0.35,
      width: 2,
    },
  },
};
