export type ThemePreset =
  | 'verso' | 'paper'  // Essential
  | 'spirited' | 'sterling'  // Vintage
  | 'koe' | 'supernatural'  // Genre
  | 'apollo' | 'zoltraak' | 'akira' | 'mr-robot' | 'howl' | 'the-office' | 'maelle' | 'shire' | 'limitless';  // Premium

export type ThemeNameStyle = 'normal' | 'italic' | 'uppercase' | 'lowercase';

export interface ThemeMetadata {
  name: string;
  subtitle: string;
  style?: ThemeNameStyle;
}

export const themeMetadata: Record<ThemePreset, ThemeMetadata> = {
  // Essential themes
  verso: { name: 'Verso', subtitle: 'Default dark theme' },
  paper: { name: 'Paper', subtitle: 'Classic screenplay feel' },
  // Vintage themes
  spirited: { name: 'Spirited', subtitle: 'Ghibli-inspired serenity' },
  sterling: { name: 'Sterling', subtitle: 'Edwardian elegance', style: 'italic' },
  // Genre themes
  koe: { name: 'Koe no Katachi', subtitle: 'Quiet beauty' },
  supernatural: { name: 'Supernatural', subtitle: "Hunter's journal" },
  // Premium themes
  apollo: { name: 'Apollo', subtitle: 'Mission control', style: 'uppercase' },
  zoltraak: { name: 'Zoltraak', subtitle: 'Fantasy arcana', style: 'italic' },
  akira: { name: 'Akira', subtitle: 'Neo-Tokyo neon', style: 'uppercase' },
  'mr-robot': { name: 'mr. robot', subtitle: 'fsociety terminal', style: 'lowercase' },
  howl: { name: 'Howl', subtitle: 'Meadow pastoral' },
  'the-office': { name: 'The Office', subtitle: 'Dunder Mifflin beige' },
  maelle: { name: 'Maëlle', subtitle: 'Art Deco elegance', style: 'italic' },
  shire: { name: 'Shire', subtitle: 'Middle-earth warmth' },
  limitless: { name: 'Limitless', subtitle: 'Infinite void blue', style: 'uppercase' },
};

export type UIFont = 'inter' | 'sf-pro' | 'geist' | 'geist-mono' | 'ibm-plex' | 'plus-jakarta' | 'space-grotesk' | 'dot-gothic' | 'audiowide' | 'oxanium' | 'chakra-petch' | 'sixtyfour' | 'doto' | 'special-elite' | 'syne' | 'poiret-one' | 'bellefair' | 'cinzel-decorative';
export type HeaderFont = 'default' | 'badeen-display' | 'bonheur-royale' | 'fraunces' | 'bodoni-moda' | 'plaster' | 'montserrat' | 'doto' | 'bellefair' | 'cinzel-decorative';
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
  | 'neon-glow'       // Accent element glow pulses
  | 'aurora';         // WebGL flowing aurora (Limitless theme)

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
  headerFont: HeaderFont;
  screenplayFont: ScreenplayFont;
  fontSize: number; // 12-18pt for UI
  borderRadius: number; // 0-16px
  animationSpeed: number; // 0.1-0.5s
  cursor: CursorSettings;
  premium?: Partial<PremiumThemeFeatures>; // Premium theme features (opt-in)
  petals?: PetalsSettings; // Ambient falling petals effect
}

// Petals ambient effect settings
export type PetalPalette = 'primary' | 'sakura' | 'rose' | 'autumn' | 'snow' | 'blossom' | 'gold' | 'blood';

export interface PetalsSettings {
  enabled: boolean;
  palette: PetalPalette;
  intensity: number; // 20-120, maps to petal count
}

export interface AutocompleteSettings {
  enabled: boolean;
  delayMs: number; // 0 = immediate, 5000 = 5 seconds
}

export type PageStyle = 'themed' | 'plain';

// Scene number position for production/shooting scripts
export type SceneNumberPosition = 'left' | 'right' | 'both';

// Paper background colors (Procreate-style presets)
export type PaperColor = 'white' | 'cream' | 'sepia' | 'gray' | 'dark';

// Highlight colors (Procreate-style swatches)
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface EditorSettings {
  autocomplete: AutocompleteSettings;
  textContrast: number; // 15-35, default 25 (lightness percentage)
  typewriterMode: boolean;
  focusLineHighlight: boolean;
  scrollMode: 'discrete' | 'continuous';
  pageStyle: PageStyle; // 'themed' uses theme colors, 'plain' uses off-white
  paperColor: PaperColor; // Paper background color preset
  highlightColor: HighlightColor; // Current highlight marker color
  showSceneNumbers: boolean; // Show scene numbers next to scene headings
  sceneNumberPosition: SceneNumberPosition; // Position: left, right, or both margins
  showPlaceholders: boolean; // Show ghost text hints in empty elements
  yjsCollaboration: boolean; // Enable Yjs CRDT real-time collaboration
  readingMode: boolean; // Reading mode - read-only with minimal UI
  showBeginnerTips: boolean; // Show contextual tips for screenwriting beginners
  spellcheck: boolean; // Browser spellcheck (red underlines)
  autoCapitalize: boolean; // Auto-capitalize character names and scene headings
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

// Shot numbering format options
export type ShotNumberFormat =
  | 'scene-shot'        // 14.1, 14.2 (industry standard)
  | 'scene-letter'      // 14A, 14B
  | 'sequential'        // 1, 2, 3 (per scene)
  | 'global-sequential'; // 1, 2, 3 (across entire shotlist)

export interface ShotDetectionSettings {
  enabled: boolean;                              // Show detected shots
  showSuggestions: boolean;                      // Show suggestions in shotlist
  patternSensitivity: 'strict' | 'normal' | 'lenient';
}

export interface ShotlistSettings {
  numberFormat: ShotNumberFormat;
  showScenePrefix: boolean;                      // For sequential, show "Scene 14 - Shot 1"
  detection: ShotDetectionSettings;
}

export interface AppSettings {
  visual: VisualSettings;
  editor: EditorSettings;
  interface: InterfaceSettings;
  layout: LayoutSettings;
  export: ExportSettings;
  shotlist: ShotlistSettings;
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
    headerFont: 'fraunces',
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
    petals: {
      enabled: false,
      palette: 'sakura',
      intensity: 60,
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
    paperColor: 'white', // Default paper color
    highlightColor: 'yellow', // Default highlight color
    showSceneNumbers: false, // Show scene numbers next to scene headings (off by default)
    sceneNumberPosition: 'both', // Industry standard: both margins for shooting scripts
    showPlaceholders: true, // Show ghost text hints in empty elements
    yjsCollaboration: false, // Yjs CRDT collaboration disabled by default
    readingMode: false, // Reading mode - read-only with minimal UI
    showBeginnerTips: false, // Beginner tips disabled by default
    spellcheck: true, // Browser spellcheck enabled by default
    autoCapitalize: true, // Auto-capitalize screenplay elements enabled by default
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
  shotlist: {
    numberFormat: 'scene-shot', // Industry standard: 14.1, 14.2
    showScenePrefix: false,
    detection: {
      enabled: true,
      showSuggestions: true,
      patternSensitivity: 'normal',
    },
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
    headerFont: 'fraunces',
    borderRadius: 10,
  },

  // Koe no Katachi: Quiet beauty - soft, heartfelt, warm
  koe: {
    themePreset: 'koe',
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
    headerFont: 'fraunces',
    borderRadius: 16,
  },

  // ============================================
  // VINTAGE THEMES - Retro cultural aesthetics
  // ============================================

  // Spirited: Ghibli-inspired serenity - refined sage-cream
  spirited: {
    themePreset: 'spirited',
    lightColors: {
      background: '60 12% 96%',             // Clean warm white
      foreground: '90 8% 22%',              // Deep sage-gray (better contrast)
      card: '60 10% 99%',                   // Nearly white
      cardForeground: '90 8% 22%',
      page: '50 8% 94%',                    // Subtle warm paper
      pageForeground: '90 10% 18%',         // High contrast text
      primary: '95 18% 38%',                // Refined moss
      primaryForeground: '60 12% 98%',
      secondary: '60 8% 92%',               // Neutral warm
      secondaryForeground: '90 8% 28%',
      muted: '60 6% 90%',
      mutedForeground: '90 6% 42%',
      accent: '95 14% 45%',                 // Muted sage accent
      accentForeground: '60 12% 98%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '60 6% 86%',
      input: '60 8% 88%',
      ring: '95 18% 38%',
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
    headerFont: 'fraunces',
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

  // Sterling: Edwardian elegance - soft charcoal and muted gold
  sterling: {
    themePreset: 'sterling',
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
        '#92400E', '#A16207', '#B45309', '#CA8A04',
        '#78350F', '#854D0E', '#6B4423', '#8B5A2B',
      ],
      actColors: {
        act1: { bg: 'rgba(146, 64, 14, 0.1)', border: 'rgba(146, 64, 14, 0.3)' },
        act2a: { bg: 'rgba(161, 98, 7, 0.1)', border: 'rgba(161, 98, 7, 0.3)' },
        act2b: { bg: 'rgba(180, 83, 9, 0.1)', border: 'rgba(180, 83, 9, 0.3)' },
        act3: { bg: 'rgba(202, 138, 4, 0.1)', border: 'rgba(202, 138, 4, 0.3)' },
      },
      sceneColors: [
        '#92400E', '#A16207', '#B45309', '#CA8A04',
        '#78350F', '#854D0E', '#6B4423', '#8B5A2B',
      ],
      characterColors: [
        '#92400E', '#A16207', '#B45309', '#CA8A04', '#78350F',
        '#854D0E', '#6B4423', '#8B5A2B', '#D97706', '#57534E',
      ],
      locationColors: [
        '#57534E', '#44403C', '#292524', '#1C1917', '#78716C',
        '#A8A29E', '#D6D3D1', '#E7E5E4', '#F5F5F4', '#6B4423',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#FBBF24', '#F59E0B', '#D97706', '#CA8A04',
        '#FCD34D', '#FDE68A', '#B45309', '#A16207',
      ],
      actColors: {
        act1: { bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.35)' },
        act2a: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
        act2b: { bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.35)' },
        act3: { bg: 'rgba(202, 138, 4, 0.12)', border: 'rgba(202, 138, 4, 0.35)' },
      },
      sceneColors: [
        '#FBBF24', '#F59E0B', '#D97706', '#CA8A04',
        '#FCD34D', '#FDE68A', '#B45309', '#A16207',
      ],
      characterColors: [
        '#FBBF24', '#F59E0B', '#D97706', '#CA8A04', '#FCD34D',
        '#FDE68A', '#B45309', '#A16207', '#92400E', '#A8A29E',
      ],
      locationColors: [
        '#A8A29E', '#D6D3D1', '#E7E5E4', '#F5F5F4', '#78716C',
        '#57534E', '#44403C', '#292524', '#1C1917', '#FCD34D',
      ],
    },
    uiFont: 'geist',
    headerFont: 'bodoni-moda',            // Edwardian elegance
    borderRadius: 6,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 530,
      color: '38 65% 52%',  // Antique gold
      glowEnabled: true,
      glowIntensity: 0.3,
      width: 2,
    },
  },

  // Supernatural: Hunter's journal - desaturated gothic with blood red accents
  supernatural: {
    themePreset: 'supernatural',
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
    uiFont: 'special-elite',
    headerFont: 'bodoni-moda',            // Gothic dramatic serif
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

  // Apollo: NASA mission control - industrial precision, dot-matrix, monochromatic with coral accent
  apollo: {
    themePreset: 'apollo',
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
    headerFont: 'montserrat',           // Clean geometric for mission control
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

  // Zoltraak: Fantasy arcana - magical purple, enchanted atmosphere
  zoltraak: {
    themePreset: 'zoltraak',
    lightColors: {
      background: '270 15% 97%',          // Faint lavender white
      foreground: '270 20% 22%',          // Deep purple-gray
      card: '270 12% 99%',
      cardForeground: '270 20% 22%',
      page: '270 18% 94%',                // Soft lavender paper
      pageForeground: '270 25% 18%',
      primary: '275 60% 50%',             // Royal purple (main magic)
      primaryForeground: '0 0% 100%',
      secondary: '270 12% 92%',
      secondaryForeground: '270 15% 28%',
      muted: '270 10% 90%',
      mutedForeground: '270 12% 48%',
      accent: '285 55% 55%',              // Orchid accent (spell glow)
      accentForeground: '0 0% 100%',
      destructive: '0 60% 50%',
      destructiveForeground: '0 0% 100%',
      border: '270 12% 86%',
      input: '270 12% 88%',
      ring: '275 60% 50%',
    },
    darkColors: {
      background: '270 35% 6%',           // Deep mystical purple-black
      foreground: '270 20% 82%',          // Pale lavender text
      card: '270 30% 9%',
      cardForeground: '270 20% 82%',
      page: '270 25% 11%',                // Dark enchanted scroll
      pageForeground: '270 18% 78%',
      primary: '280 65% 62%',             // Bright magical violet
      primaryForeground: '0 0% 100%',
      secondary: '270 25% 15%',
      secondaryForeground: '270 15% 75%',
      muted: '270 20% 13%',
      mutedForeground: '270 15% 52%',
      accent: '290 70% 60%',              // Glowing orchid (magic essence)
      accentForeground: '270 35% 6%',
      destructive: '0 60% 50%',
      destructiveForeground: '0 0% 100%',
      border: '270 20% 20%',
      input: '270 20% 18%',
      ring: '280 65% 62%',
    },
    lightVisualization: {
      beatColors: [
        '#9333EA', '#7C3AED', '#8B5CF6', '#A855F7',  // Purple spectrum
        '#C084FC', '#D8B4FE', '#6D28D9', '#7E22CE',  // Violet variations
      ],
      actColors: {
        act1: { bg: 'rgba(147, 51, 234, 0.1)', border: 'rgba(147, 51, 234, 0.3)' },
        act2a: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
        act2b: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)' },
        act3: { bg: 'rgba(192, 132, 252, 0.1)', border: 'rgba(192, 132, 252, 0.3)' },
      },
      sceneColors: [
        '#9333EA', '#8B5CF6', '#A855F7', '#C084FC',
        '#7C3AED', '#6D28D9', '#D8B4FE', '#7E22CE',
      ],
      characterColors: [
        '#9333EA', '#8B5CF6', '#A855F7', '#C084FC', '#7C3AED',
        '#6D28D9', '#D8B4FE', '#7E22CE', '#581C87', '#6B21A8',
      ],
      locationColors: [
        '#6D28D9', '#7E22CE', '#581C87', '#4C1D95', '#9333EA',
        '#7C3AED', '#8B5CF6', '#A855F7', '#C084FC', '#D8B4FE',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#C084FC', '#A855F7', '#9333EA', '#7C3AED',  // Bright purples
        '#D8B4FE', '#E9D5FF', '#8B5CF6', '#6D28D9',  // Glowing violets
      ],
      actColors: {
        act1: { bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.35)' },
        act2a: { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)' },
        act2b: { bg: 'rgba(147, 51, 234, 0.12)', border: 'rgba(147, 51, 234, 0.35)' },
        act3: { bg: 'rgba(216, 180, 254, 0.12)', border: 'rgba(216, 180, 254, 0.35)' },
      },
      sceneColors: [
        '#C084FC', '#A855F7', '#D8B4FE', '#E9D5FF',
        '#9333EA', '#7C3AED', '#8B5CF6', '#6D28D9',
      ],
      characterColors: [
        '#C084FC', '#A855F7', '#9333EA', '#7C3AED', '#D8B4FE',
        '#E9D5FF', '#8B5CF6', '#6D28D9', '#F3E8FF', '#581C87',
      ],
      locationColors: [
        '#9333EA', '#7C3AED', '#8B5CF6', '#A855F7', '#C084FC',
        '#D8B4FE', '#E9D5FF', '#F3E8FF', '#6D28D9', '#7E22CE',
      ],
    },
    uiFont: 'geist',
    headerFont: 'fraunces',
    borderRadius: 6,
    animationSpeed: 0.15,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 500,
      color: '280 65% 58%',               // Purple magic cursor
      glowEnabled: true,
      glowIntensity: 0.4,                 // Magical glow
      width: 2,
    },
    premium: {
      backgroundPattern: 'blueprint-grid',
      patternOpacity: 0.03,
      patternColor: '275 50% 60%',        // Purple grid lines
      pageChrome: 'none',
      chromeOpacity: 0,
      ambientEffect: 'neon-glow',         // Subtle magic glow
      ambientIntensity: 0.15,
      uiChrome: 'glassmorphic',
    },
  },

  // Akira: Neo-Tokyo neon - vibrant reds, city lights
  akira: {
    themePreset: 'akira',
    lightColors: {
      background: '0 5% 96%',             // Cool off-white
      foreground: '0 5% 15%',             // Near-black
      card: '0 3% 98%',
      cardForeground: '0 5% 15%',
      page: '0 4% 94%',                   // Neutral paper
      pageForeground: '0 5% 12%',
      primary: '0 75% 50%',               // Kaneda red
      primaryForeground: '0 0% 100%',
      secondary: '0 3% 90%',
      secondaryForeground: '0 5% 20%',
      muted: '0 3% 88%',
      mutedForeground: '0 3% 45%',
      accent: '195 80% 45%',              // Neon cyan
      accentForeground: '0 0% 100%',
      destructive: '0 65% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 3% 85%',
      input: '0 3% 88%',
      ring: '0 75% 50%',
    },
    darkColors: {
      background: '220 15% 6%',           // Neo-Tokyo night (blue-black)
      foreground: '0 0% 90%',             // Bright white
      card: '220 12% 9%',
      cardForeground: '0 0% 90%',
      page: '220 10% 8%',                 // Dark urban
      pageForeground: '0 0% 88%',
      primary: '0 80% 55%',               // Glowing red
      primaryForeground: '0 0% 100%',
      secondary: '220 10% 14%',
      secondaryForeground: '0 0% 82%',
      muted: '220 10% 12%',
      mutedForeground: '0 0% 55%',
      accent: '195 100% 50%',             // Electric cyan
      accentForeground: '220 15% 6%',
      destructive: '0 55% 45%',
      destructiveForeground: '0 0% 100%',
      border: '220 10% 18%',
      input: '220 10% 14%',
      ring: '0 80% 55%',
    },
    lightVisualization: {
      beatColors: [
        '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
        '#EF4444', '#F87171', '#0891B2', '#06B6D4',
      ],
      actColors: {
        act1: { bg: 'rgba(220, 38, 38, 0.1)', border: 'rgba(220, 38, 38, 0.3)' },
        act2a: { bg: 'rgba(185, 28, 28, 0.1)', border: 'rgba(185, 28, 28, 0.3)' },
        act2b: { bg: 'rgba(8, 145, 178, 0.1)', border: 'rgba(8, 145, 178, 0.3)' },
        act3: { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)' },
      },
      sceneColors: [
        '#DC2626', '#B91C1C', '#0891B2', '#06B6D4',
        '#EF4444', '#F87171', '#22D3EE', '#991B1B',
      ],
      characterColors: [
        '#DC2626', '#B91C1C', '#0891B2', '#06B6D4', '#EF4444',
        '#F87171', '#22D3EE', '#991B1B', '#7F1D1D', '#0E7490',
      ],
      locationColors: [
        '#1E293B', '#334155', '#475569', '#64748B', '#0F172A',
        '#0891B2', '#0E7490', '#155E75', '#164E63', '#0C4A6E',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#F87171', '#EF4444', '#DC2626', '#B91C1C',
        '#FCA5A5', '#22D3EE', '#06B6D4', '#0891B2',
      ],
      actColors: {
        act1: { bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.35)' },
        act2a: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
        act2b: { bg: 'rgba(34, 211, 238, 0.12)', border: 'rgba(34, 211, 238, 0.35)' },
        act3: { bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.35)' },
      },
      sceneColors: [
        '#F87171', '#EF4444', '#22D3EE', '#06B6D4',
        '#DC2626', '#B91C1C', '#67E8F9', '#0891B2',
      ],
      characterColors: [
        '#F87171', '#EF4444', '#22D3EE', '#06B6D4', '#DC2626',
        '#B91C1C', '#67E8F9', '#0891B2', '#FCA5A5', '#A5F3FC',
      ],
      locationColors: [
        '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#475569',
        '#22D3EE', '#67E8F9', '#A5F3FC', '#CFFAFE', '#06B6D4',
      ],
    },
    uiFont: 'doto',
    headerFont: 'doto',
    borderRadius: 4,
    animationSpeed: 0.15,
    cursor: {
      mode: 'line',
      blinkStyle: 'blink',
      blinkSpeed: 450,
      color: '0 75% 55%',                 // Kaneda red cursor
      glowEnabled: true,
      glowIntensity: 0.4,
      width: 2,
    },
  },

  // Mr. Robot: Amber phosphor terminal - vintage CRT monitor
  'mr-robot': {
    themePreset: 'mr-robot',
    lightColors: {
      background: '35 10% 96%',           // Warm off-white
      foreground: '30 20% 15%',           // Dark amber-brown text
      card: '35 8% 98%',
      cardForeground: '30 20% 15%',
      page: '35 12% 94%',                 // Warm cream paper
      pageForeground: '30 25% 12%',
      primary: '35 90% 45%',              // Amber
      primaryForeground: '0 0% 100%',
      secondary: '35 8% 92%',
      secondaryForeground: '30 15% 20%',
      muted: '35 6% 90%',
      mutedForeground: '30 10% 45%',
      accent: '25 85% 50%',               // Warm orange accent
      accentForeground: '0 0% 100%',
      destructive: '0 70% 50%',
      destructiveForeground: '0 0% 100%',
      border: '35 8% 85%',
      input: '35 8% 88%',
      ring: '35 90% 45%',
    },
    darkColors: {
      background: '0 0% 2%',              // True black CRT
      foreground: '35 100% 55%',          // Amber phosphor text
      card: '0 0% 5%',                    // Panel dark
      cardForeground: '35 100% 55%',
      page: '0 0% 4%',                    // CRT screen
      pageForeground: '35 100% 50%',
      primary: '35 100% 50%',             // Bright amber
      primaryForeground: '0 0% 2%',
      secondary: '0 0% 8%',
      secondaryForeground: '35 80% 60%',
      muted: '0 0% 6%',
      mutedForeground: '35 60% 40%',
      accent: '25 100% 55%',              // Warm orange
      accentForeground: '0 0% 2%',
      destructive: '0 70% 55%',
      destructiveForeground: '0 0% 100%',
      border: '35 30% 15%',               // Subtle amber border
      input: '0 0% 10%',
      ring: '35 100% 50%',
    },
    lightVisualization: {
      beatColors: [
        '#D97706', '#B45309', '#92400E', '#78350F',
        '#F59E0B', '#FBBF24', '#CA8A04', '#A16207',
      ],
      actColors: {
        act1: { bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.3)' },
        act2a: { bg: 'rgba(180, 83, 9, 0.1)', border: 'rgba(180, 83, 9, 0.3)' },
        act2b: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
        act3: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)' },
      },
      sceneColors: [
        '#D97706', '#B45309', '#F59E0B', '#FBBF24',
        '#92400E', '#78350F', '#CA8A04', '#A16207',
      ],
      characterColors: [
        '#D97706', '#B45309', '#F59E0B', '#FBBF24', '#92400E',
        '#78350F', '#CA8A04', '#A16207', '#FCD34D', '#FDE68A',
      ],
      locationColors: [
        '#78350F', '#92400E', '#B45309', '#D97706', '#F59E0B',
        '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7', '#FFFBEB',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#FBBF24', '#F59E0B', '#D97706', '#B45309',
        '#FCD34D', '#FDE68A', '#CA8A04', '#A16207',
      ],
      actColors: {
        act1: { bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.35)' },
        act2a: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
        act2b: { bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.35)' },
        act3: { bg: 'rgba(180, 83, 9, 0.12)', border: 'rgba(180, 83, 9, 0.35)' },
      },
      sceneColors: [
        '#FBBF24', '#F59E0B', '#D97706', '#B45309',
        '#FCD34D', '#CA8A04', '#A16207', '#92400E',
      ],
      characterColors: [
        '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#FCD34D',
        '#CA8A04', '#A16207', '#92400E', '#FDE68A', '#FEF3C7',
      ],
      locationColors: [
        '#B45309', '#A16207', '#92400E', '#78350F', '#D97706',
        '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7',
      ],
    },
    uiFont: 'geist-mono',
    borderRadius: 0,                      // Sharp CRT corners
    animationSpeed: 0.08,                 // Instant
    cursor: {
      mode: 'block',                      // Terminal block cursor
      blinkStyle: 'blink',
      blinkSpeed: 530,
      color: '35 100% 50%',               // Amber cursor
      glowEnabled: true,
      glowIntensity: 0.3,                 // Phosphor glow
      width: 2,
    },
    premium: {
      backgroundPattern: 'scanlines',
      patternOpacity: 0.03,
      pageChrome: 'none',
      chromeOpacity: 0,
      ambientEffect: 'crt-flicker',
      ambientIntensity: 0.02,
      uiChrome: 'default',
    },
  },

  // Howl: Meadow pastoral - soft sage, lavender, wildflowers
  howl: {
    themePreset: 'howl',
    lightColors: {
      background: '80 25% 97%',           // Soft morning meadow cream
      foreground: '150 15% 22%',          // Gentle sage-grey text
      card: '80 20% 99%',
      cardForeground: '150 15% 22%',
      page: '50 30% 95%',                 // Warm cream parchment
      pageForeground: '150 18% 18%',
      primary: '145 30% 38%',             // Soft sage green
      primaryForeground: '0 0% 100%',
      secondary: '100 18% 92%',
      secondaryForeground: '150 15% 28%',
      muted: '90 15% 90%',
      mutedForeground: '150 10% 45%',
      accent: '280 35% 65%',              // Soft lavender
      accentForeground: '0 0% 100%',
      destructive: '0 50% 50%',
      destructiveForeground: '0 0% 100%',
      border: '100 12% 85%',
      input: '100 12% 88%',
      ring: '145 30% 38%',
    },
    darkColors: {
      background: '150 18% 8%',           // Deep forest night
      foreground: '80 20% 88%',           // Soft meadow cream
      card: '150 15% 11%',
      cardForeground: '80 20% 88%',
      page: '150 12% 13%',                // Night meadow paper
      pageForeground: '80 18% 82%',
      primary: '145 35% 50%',             // Moonlit sage
      primaryForeground: '150 18% 8%',
      secondary: '150 12% 15%',
      secondaryForeground: '80 18% 80%',
      muted: '150 10% 13%',
      mutedForeground: '100 12% 50%',
      accent: '280 30% 55%',              // Dusk lavender
      accentForeground: '0 0% 100%',
      destructive: '0 45% 45%',
      destructiveForeground: '0 0% 100%',
      border: '150 10% 18%',
      input: '150 10% 16%',
      ring: '145 35% 50%',
    },
    lightVisualization: {
      beatColors: [
        '#6B8E6B', '#8BA58B', '#A3C1A3', '#7CAA7C',
        '#9DB49D', '#85A085', '#78967B', '#90B090',
      ],
      actColors: {
        act1: { bg: 'rgba(107, 142, 107, 0.1)', border: 'rgba(107, 142, 107, 0.3)' },
        act2a: { bg: 'rgba(139, 165, 139, 0.1)', border: 'rgba(139, 165, 139, 0.3)' },
        act2b: { bg: 'rgba(163, 193, 163, 0.1)', border: 'rgba(163, 193, 163, 0.3)' },
        act3: { bg: 'rgba(147, 112, 169, 0.1)', border: 'rgba(147, 112, 169, 0.3)' },
      },
      sceneColors: [
        '#6B8E6B', '#8BA58B', '#9370A9', '#B088C0',
        '#7CAA7C', '#A3C1A3', '#C9A0D6', '#85A085',
      ],
      characterColors: [
        '#6B8E6B', '#8BA58B', '#9370A9', '#B088C0', '#7CAA7C',
        '#A3C1A3', '#C9A0D6', '#85A085', '#D4A5E0', '#78967B',
      ],
      locationColors: [
        '#5C7A5C', '#6B8E6B', '#7CAA7C', '#8BA58B', '#9370A9',
        '#A3C1A3', '#B088C0', '#90B090', '#C9A0D6', '#85A085',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#8FBC8F', '#A8D5A8', '#98D098', '#B8E0B8',
        '#A0CCA0', '#90C090', '#AAD8AA', '#C0E8C0',
      ],
      actColors: {
        act1: { bg: 'rgba(143, 188, 143, 0.12)', border: 'rgba(143, 188, 143, 0.35)' },
        act2a: { bg: 'rgba(168, 213, 168, 0.12)', border: 'rgba(168, 213, 168, 0.35)' },
        act2b: { bg: 'rgba(152, 208, 152, 0.12)', border: 'rgba(152, 208, 152, 0.35)' },
        act3: { bg: 'rgba(186, 152, 208, 0.12)', border: 'rgba(186, 152, 208, 0.35)' },
      },
      sceneColors: [
        '#8FBC8F', '#A8D5A8', '#BA98D0', '#D0B0E0',
        '#98D098', '#B8E0B8', '#C8A8D8', '#AAD8AA',
      ],
      characterColors: [
        '#8FBC8F', '#A8D5A8', '#BA98D0', '#D0B0E0', '#98D098',
        '#B8E0B8', '#C8A8D8', '#AAD8AA', '#E0C0F0', '#C0E8C0',
      ],
      locationColors: [
        '#7AA87A', '#8FBC8F', '#98D098', '#A8D5A8', '#BA98D0',
        '#B8E0B8', '#D0B0E0', '#AAD8AA', '#C8A8D8', '#C0E8C0',
      ],
    },
    uiFont: 'plus-jakarta',
    headerFont: 'fraunces',               // Whimsical serif for Ghibli pastoral
    borderRadius: 12,
    animationSpeed: 0.25,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 530,
      color: '145 35% 45%',               // Soft sage cursor
      glowEnabled: false,
      glowIntensity: 0,
      width: 2,
    },
  },

  // The Office: Dunder Mifflin beige - professional, clean
  'the-office': {
    themePreset: 'the-office',
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
    lightVisualization: {
      beatColors: [
        '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A',
        '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE',
      ],
      actColors: {
        act1: { bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.3)' },
        act2a: { bg: 'rgba(29, 78, 216, 0.1)', border: 'rgba(29, 78, 216, 0.3)' },
        act2b: { bg: 'rgba(30, 64, 175, 0.1)', border: 'rgba(30, 64, 175, 0.3)' },
        act3: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
      },
      sceneColors: [
        '#2563EB', '#1D4ED8', '#3B82F6', '#60A5FA',
        '#1E40AF', '#1E3A8A', '#93C5FD', '#BFDBFE',
      ],
      characterColors: [
        '#2563EB', '#1D4ED8', '#3B82F6', '#60A5FA', '#1E40AF',
        '#1E3A8A', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF',
      ],
      locationColors: [
        '#64748B', '#475569', '#334155', '#1E293B', '#94A3B8',
        '#CBD5E1', '#E2E8F0', '#F1F5F9', '#F8FAFC', '#0F172A',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8',
        '#93C5FD', '#BFDBFE', '#DBEAFE', '#1E40AF',
      ],
      actColors: {
        act1: { bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.35)' },
        act2a: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' },
        act2b: { bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.35)' },
        act3: { bg: 'rgba(29, 78, 216, 0.12)', border: 'rgba(29, 78, 216, 0.35)' },
      },
      sceneColors: [
        '#60A5FA', '#3B82F6', '#93C5FD', '#BFDBFE',
        '#2563EB', '#1D4ED8', '#DBEAFE', '#1E40AF',
      ],
      characterColors: [
        '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#93C5FD',
        '#BFDBFE', '#1E40AF', '#1E3A8A', '#DBEAFE', '#EFF6FF',
      ],
      locationColors: [
        '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9', '#64748B',
        '#475569', '#334155', '#1E293B', '#0F172A', '#F8FAFC',
      ],
    },
    uiFont: 'sf-pro',
    headerFont: 'fraunces',
    borderRadius: 10,
    animationSpeed: 0.15,
  },

  // Maëlle: Symphony of Vines - luxurious gold on crushed black marble
  maelle: {
    themePreset: 'maelle',
    lightColors: {
      background: '40 8% 96%',            // Soft marble white
      foreground: '30 10% 8%',            // Near black
      card: '40 6% 98%',
      cardForeground: '30 10% 8%',
      page: '40 10% 94%',                 // Antique paper
      pageForeground: '30 12% 6%',
      primary: '43 85% 42%',              // Rich antique gold
      primaryForeground: '30 10% 8%',
      secondary: '40 6% 90%',
      secondaryForeground: '30 8% 15%',
      muted: '40 5% 88%',
      mutedForeground: '30 6% 40%',
      accent: '38 75% 45%',               // Warm brass
      accentForeground: '40 8% 96%',
      destructive: '0 60% 45%',
      destructiveForeground: '0 0% 100%',
      border: '40 6% 82%',
      input: '40 6% 86%',
      ring: '43 85% 42%',
    },
    darkColors: {
      background: '30 12% 2%',            // Crushed black
      foreground: '42 20% 92%',           // Warm antique cream
      card: '30 10% 4%',
      cardForeground: '42 20% 92%',
      page: '30 8% 5%',                   // Dark marble
      pageForeground: '42 18% 90%',
      primary: '45 95% 55%',              // Radiant gold
      primaryForeground: '30 12% 2%',
      secondary: '30 8% 8%',
      secondaryForeground: '42 15% 80%',
      muted: '30 6% 6%',
      mutedForeground: '42 10% 45%',
      accent: '40 90% 50%',               // Bright gold accent
      accentForeground: '30 12% 2%',
      destructive: '0 55% 45%',
      destructiveForeground: '0 0% 100%',
      border: '35 8% 12%',
      input: '35 6% 10%',
      ring: '45 95% 55%',
    },
    lightVisualization: {
      beatColors: [
        '#92400E', '#78350F', '#B45309', '#A16207',
        '#CA8A04', '#D97706', '#6B4423', '#5C4033',
      ],
      actColors: {
        act1: { bg: 'rgba(146, 64, 14, 0.12)', border: 'rgba(146, 64, 14, 0.35)' },
        act2a: { bg: 'rgba(120, 53, 15, 0.12)', border: 'rgba(120, 53, 15, 0.35)' },
        act2b: { bg: 'rgba(180, 83, 9, 0.12)', border: 'rgba(180, 83, 9, 0.35)' },
        act3: { bg: 'rgba(202, 138, 4, 0.12)', border: 'rgba(202, 138, 4, 0.35)' },
      },
      sceneColors: [
        '#92400E', '#78350F', '#B45309', '#CA8A04',
        '#A16207', '#6B4423', '#D97706', '#5C4033',
      ],
      characterColors: [
        '#92400E', '#78350F', '#B45309', '#CA8A04', '#A16207',
        '#6B4423', '#D97706', '#5C4033', '#44403C', '#57534E',
      ],
      locationColors: [
        '#5C4033', '#6B4423', '#78350F', '#92400E', '#A16207',
        '#B45309', '#CA8A04', '#44403C', '#57534E', '#6B7280',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#FBBF24', '#F59E0B', '#FCD34D', '#D97706',
        '#CA8A04', '#B45309', '#FDE68A', '#A16207',
      ],
      actColors: {
        act1: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)' },
        act2a: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
        act2b: { bg: 'rgba(252, 211, 77, 0.15)', border: 'rgba(252, 211, 77, 0.4)' },
        act3: { bg: 'rgba(217, 119, 6, 0.15)', border: 'rgba(217, 119, 6, 0.4)' },
      },
      sceneColors: [
        '#FBBF24', '#F59E0B', '#FCD34D', '#D97706',
        '#CA8A04', '#B45309', '#FDE68A', '#A16207',
      ],
      characterColors: [
        '#FBBF24', '#F59E0B', '#FCD34D', '#D97706', '#CA8A04',
        '#B45309', '#FDE68A', '#A16207', '#92400E', '#FEF3C7',
      ],
      locationColors: [
        '#B45309', '#A16207', '#92400E', '#78350F', '#CA8A04',
        '#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A',
      ],
    },
    uiFont: 'cinzel-decorative',
    headerFont: 'cinzel-decorative',
    borderRadius: 4,
    animationSpeed: 0.25,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 530,
      color: '45 95% 55%',                // Radiant gold cursor
      glowEnabled: true,
      glowIntensity: 0.45,
      width: 2,
    },
    petals: {
      enabled: true,
      palette: 'gold',                    // Gold petals
      intensity: 50,
    },
  },

  // Shire: Middle-earth warmth - LOTR inspired (Rivendell light, Mordor dark)
  shire: {
    themePreset: 'shire',
    lightColors: {
      background: '145 25% 96%',          // Ethereal pale green (Rivendell)
      foreground: '150 20% 18%',          // Deep forest ink
      card: '145 20% 98%',
      cardForeground: '150 20% 18%',
      page: '140 30% 93%',                // Elvish parchment
      pageForeground: '150 25% 15%',
      primary: '145 45% 38%',             // Rivendell green
      primaryForeground: '0 0% 100%',
      secondary: '145 15% 90%',
      secondaryForeground: '150 18% 25%',
      muted: '145 18% 88%',
      mutedForeground: '150 12% 45%',
      accent: '42 85% 48%',               // One Ring gold
      accentForeground: '150 25% 12%',
      destructive: '0 60% 50%',
      destructiveForeground: '0 0% 100%',
      border: '145 15% 82%',
      input: '145 15% 84%',
      ring: '42 85% 48%',                 // Gold ring focus
    },
    darkColors: {
      background: '0 8% 5%',              // Mordor black (warm undertone)
      foreground: '45 20% 85%',           // Aged parchment text
      card: '0 6% 8%',
      cardForeground: '45 20% 85%',
      page: '15 10% 10%',                 // Dark volcanic paper
      pageForeground: '45 18% 80%',
      primary: '140 50% 45%',             // Muted elvish green
      primaryForeground: '0 0% 100%',
      secondary: '0 5% 13%',
      secondaryForeground: '45 15% 75%',
      muted: '0 5% 11%',
      mutedForeground: '45 10% 50%',
      accent: '42 90% 55%',               // Glowing One Ring gold
      accentForeground: '0 8% 5%',
      destructive: '15 70% 50%',          // Mordor fire red-orange
      destructiveForeground: '0 0% 100%',
      border: '0 5% 18%',
      input: '0 5% 15%',
      ring: '42 90% 55%',
    },
    lightVisualization: {
      beatColors: [
        '#047857', '#059669', '#10B981', '#34D399',  // Elvish greens
        '#B8860B', '#DAA520', '#FFD700', '#D4AF37',  // Ring golds
      ],
      actColors: {
        act1: { bg: 'rgba(4, 120, 87, 0.1)', border: 'rgba(4, 120, 87, 0.3)' },     // Shire
        act2a: { bg: 'rgba(218, 165, 32, 0.1)', border: 'rgba(218, 165, 32, 0.3)' }, // Journey
        act2b: { bg: 'rgba(184, 134, 11, 0.12)', border: 'rgba(184, 134, 11, 0.35)' }, // Darkness
        act3: { bg: 'rgba(212, 175, 55, 0.1)', border: 'rgba(212, 175, 55, 0.3)' },  // Return
      },
      sceneColors: [
        '#047857', '#059669', '#DAA520', '#D4AF37',
        '#10B981', '#34D399', '#B8860B', '#FFD700',
      ],
      characterColors: [
        '#047857', '#059669', '#10B981', '#34D399', '#DAA520',
        '#D4AF37', '#065F46', '#064E3B', '#B8860B', '#FFD700',
      ],
      locationColors: [
        '#064E3B', '#065F46', '#047857', '#059669', '#78350F',
        '#92400E', '#B8860B', '#DAA520', '#D4AF37', '#FFD700',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#34D399', '#10B981', '#059669', '#047857',  // Ethereal greens
        '#FFD700', '#DAA520', '#F59E0B', '#D97706',  // Molten golds
      ],
      actColors: {
        act1: { bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.35)' },
        act2a: { bg: 'rgba(255, 215, 0, 0.1)', border: 'rgba(255, 215, 0, 0.3)' },
        act2b: { bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.35)' },
        act3: { bg: 'rgba(218, 165, 32, 0.12)', border: 'rgba(218, 165, 32, 0.35)' },
      },
      sceneColors: [
        '#34D399', '#10B981', '#FFD700', '#DAA520',
        '#059669', '#047857', '#F59E0B', '#D97706',
      ],
      characterColors: [
        '#34D399', '#10B981', '#059669', '#047857', '#FFD700',
        '#DAA520', '#6EE7B7', '#A7F3D0', '#F59E0B', '#D97706',
      ],
      locationColors: [
        '#047857', '#059669', '#065F46', '#064E3B', '#10B981',
        '#D97706', '#DAA520', '#FFD700', '#B8860B', '#D4AF37',
      ],
    },
    uiFont: 'plus-jakarta',
    headerFont: 'bodoni-moda',            // Elegant, cinematic
    borderRadius: 6,
    animationSpeed: 0.25,                 // Slightly slower, epic feel
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 600,
      color: '42 90% 52%',                // Ring gold cursor
      glowEnabled: true,
      glowIntensity: 0.4,
      width: 2,
    },
    premium: {
      backgroundPattern: 'parchment',     // Aged manuscript feel
      patternOpacity: 0.05,
      pageChrome: 'illuminated-border',   // Elvish manuscript borders
      chromeOpacity: 0.2,
      ambientEffect: 'candlelight',       // Subtle warm flicker
      ambientIntensity: 0.1,
      uiChrome: 'default',
    },
  },

  // Limitless: Infinite void blue - Gojo-inspired ethereal baby blue
  limitless: {
    themePreset: 'limitless',
    lightColors: {
      background: '200 70% 97%',          // Ethereal baby blue
      foreground: '210 50% 20%',          // Deep blue-gray text
      card: '200 60% 99%',
      cardForeground: '210 50% 20%',
      page: '200 65% 95%',                // Soft infinite blue paper
      pageForeground: '210 55% 18%',
      primary: '200 90% 55%',             // Brilliant sky blue
      primaryForeground: '0 0% 100%',
      secondary: '200 50% 92%',
      secondaryForeground: '210 40% 25%',
      muted: '200 55% 94%',
      mutedForeground: '210 30% 45%',
      accent: '190 85% 50%',              // Cyan infinity
      accentForeground: '0 0% 100%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '200 45% 88%',
      input: '200 45% 88%',
      ring: '200 90% 55%',
    },
    darkColors: {
      background: '220 60% 6%',           // Void darkness
      foreground: '200 60% 90%',          // Ethereal light blue
      card: '220 55% 9%',
      cardForeground: '200 60% 90%',
      page: '220 50% 11%',
      pageForeground: '200 55% 85%',
      primary: '200 100% 65%',            // Bright infinity blue
      primaryForeground: '220 60% 6%',
      secondary: '220 45% 15%',
      secondaryForeground: '200 50% 82%',
      muted: '220 40% 13%',
      mutedForeground: '200 40% 55%',
      accent: '190 100% 55%',             // Electric cyan
      accentForeground: '220 60% 6%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '220 40% 20%',
      input: '220 40% 18%',
      ring: '200 100% 60%',
    },
    lightVisualization: {
      beatColors: [
        '#38BDF8', '#0EA5E9', '#0284C7', '#0369A1',
        '#7DD3FC', '#06B6D4', '#22D3EE', '#67E8F9',
      ],
      actColors: {
        act1: { bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.3)' },
        act2a: { bg: 'rgba(14, 165, 233, 0.1)', border: 'rgba(14, 165, 233, 0.3)' },
        act2b: { bg: 'rgba(2, 132, 199, 0.1)', border: 'rgba(2, 132, 199, 0.3)' },
        act3: { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)' },
      },
      sceneColors: [
        '#38BDF8', '#0EA5E9', '#06B6D4', '#22D3EE',
        '#0284C7', '#0369A1', '#7DD3FC', '#67E8F9',
      ],
      characterColors: [
        '#38BDF8', '#0EA5E9', '#0284C7', '#0369A1', '#7DD3FC',
        '#06B6D4', '#22D3EE', '#67E8F9', '#A5F3FC', '#BAE6FD',
      ],
      locationColors: [
        '#0284C7', '#0369A1', '#075985', '#0C4A6E', '#0EA5E9',
        '#38BDF8', '#7DD3FC', '#BAE6FD', '#E0F2FE', '#F0F9FF',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#7DD3FC', '#38BDF8', '#0EA5E9', '#0284C7',
        '#A5F3FC', '#67E8F9', '#22D3EE', '#06B6D4',
      ],
      actColors: {
        act1: { bg: 'rgba(125, 211, 252, 0.15)', border: 'rgba(125, 211, 252, 0.4)' },
        act2a: { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
        act2b: { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.4)' },
        act3: { bg: 'rgba(34, 211, 238, 0.15)', border: 'rgba(34, 211, 238, 0.4)' },
      },
      sceneColors: [
        '#7DD3FC', '#38BDF8', '#22D3EE', '#67E8F9',
        '#0EA5E9', '#0284C7', '#A5F3FC', '#06B6D4',
      ],
      characterColors: [
        '#7DD3FC', '#38BDF8', '#0EA5E9', '#0284C7', '#A5F3FC',
        '#22D3EE', '#67E8F9', '#06B6D4', '#BAE6FD', '#CFFAFE',
      ],
      locationColors: [
        '#0EA5E9', '#0284C7', '#0369A1', '#075985', '#38BDF8',
        '#7DD3FC', '#BAE6FD', '#E0F2FE', '#F0F9FF', '#ECFEFF',
      ],
    },
    uiFont: 'syne',
    headerFont: 'badeen-display',
    borderRadius: 14,
    animationSpeed: 0.2,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 500,
      color: '200 100% 60%',              // Infinite blue cursor
      glowEnabled: true,
      glowIntensity: 0.4,
      width: 2,
    },
    premium: {
      backgroundPattern: 'none',
      patternOpacity: 0,
      pageChrome: 'none',
      chromeOpacity: 0,
      ambientEffect: 'aurora',            // WebGL flowing aurora background
      ambientIntensity: 1.0,
      uiChrome: 'glassmorphic',
    },
  },
};
