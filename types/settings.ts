export type ThemePreset = 'minimal' | 'warm' | 'midnight' | 'paper' | 'custom';

export type UIFont = 'inter' | 'sf-pro' | 'geist' | 'ibm-plex';
export type ScreenplayFont = 'courier-prime' | 'courier-new' | 'courier-final-draft';

export type SidebarPosition = 'left' | 'right' | 'hidden';
export type ToolbarPosition = 'top' | 'bottom' | 'floating' | 'hidden';
export type NavigatorVisibility = 'always' | 'auto' | 'hidden';
export type LayoutMode = 'modern' | 'classic';

export type ExportFormat = 'pdf' | 'fdx' | 'fountain' | 'txt' | 'html';
export type PaperSize = 'letter' | 'a4' | 'legal';

export interface ColorScheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
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

export interface VisualSettings {
  themePreset: ThemePreset;
  lightColors: ColorScheme;
  darkColors: ColorScheme;
  uiFont: UIFont;
  screenplayFont: ScreenplayFont;
  fontSize: number; // 12-18pt for UI
  borderRadius: number; // 0-16px
  animationSpeed: number; // 0.1-0.5s
  useGlassEffect: boolean;
}

export interface EditorSettings {
  autoSaveInterval: number; // seconds, 0 = off
  smartQuotes: boolean;
  autoCapitalize: boolean;
  tabBehavior: 'indent' | 'next-field' | 'autocomplete';
  spellCheck: boolean;
  showLineNumbers: boolean;
  showPageBreaks: boolean;
  pageCountMode: 'auto' | 'manual';
  linesPerPage: number; // 54-58
  enableSnippets: boolean;
  enableAutocomplete: boolean;
  zoom: number; // 50-200, default 100
}

export interface LayoutSettings {
  sidebarPosition: SidebarPosition;
  sidebarCollapsed: boolean;
  toolbarPosition: ToolbarPosition;
  navigatorVisibility: NavigatorVisibility;
  distractionFreeMode: boolean;
  compactMode: boolean;
  showStats: boolean;
  layoutMode: LayoutMode;
}

export interface ExportSettings {
  defaultFormat: ExportFormat;
  paperSize: PaperSize;
  includeWatermark: boolean;
  watermarkText: string;
  showSceneNumbers: boolean;
  sceneNumberSide: 'left' | 'right' | 'both';
  includeHeader: boolean;
  headerText: string;
  includeFooter: boolean;
  footerText: string;
  revisionColors: boolean;
}

export interface ShortcutSettings {
  [action: string]: string; // e.g., 'save': 'Cmd+S'
}

export interface AppSettings {
  visual: VisualSettings;
  editor: EditorSettings;
  layout: LayoutSettings;
  export: ExportSettings;
  shortcuts: ShortcutSettings;
}

export const defaultSettings: AppSettings = {
  visual: {
    themePreset: 'warm',
    lightColors: {
      // Warm paper tones (matches globals.css)
      background: '40 33% 98%',           // Warm off-white
      foreground: '30 8% 38%',            // Soft warm brown - easy on eyes
      card: '0 0% 100%',                  // Pure white cards
      cardForeground: '30 8% 38%',
      primary: '24 60% 50%',              // Warm terracotta
      primaryForeground: '0 0% 100%',
      secondary: '37 15% 94%',
      secondaryForeground: '30 8% 42%',
      muted: '37 15% 94%',
      mutedForeground: '30 6% 55%',       // Gentle secondary text
      accent: '37 20% 92%',
      accentForeground: '30 8% 38%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '37 15% 88%',
      input: '37 15% 88%',
      ring: '24 50% 50%',
    },
    darkColors: {
      // Warm dark tones (matches globals.css)
      background: '30 15% 10%',           // Warm charcoal
      foreground: '40 12% 72%',           // Soft warm cream - easy on eyes
      card: '30 12% 13%',
      cardForeground: '40 12% 72%',
      primary: '24 55% 55%',              // Brighter terracotta
      primaryForeground: '30 15% 10%',
      secondary: '30 10% 18%',
      secondaryForeground: '40 12% 68%',
      muted: '30 10% 18%',
      mutedForeground: '30 8% 48%',       // Gentle secondary text
      accent: '30 12% 20%',
      accentForeground: '40 12% 72%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '30 10% 22%',
      input: '30 10% 22%',
      ring: '24 50% 55%',
    },
    uiFont: 'inter',
    screenplayFont: 'courier-prime',
    fontSize: 14,
    borderRadius: 12,
    animationSpeed: 0.2,
    useGlassEffect: true,
  },
  editor: {
    autoSaveInterval: 30,
    smartQuotes: true,
    autoCapitalize: true,
    tabBehavior: 'autocomplete',
    spellCheck: true,
    showLineNumbers: false,
    showPageBreaks: true,
    pageCountMode: 'auto',
    linesPerPage: 55,
    enableSnippets: true,
    enableAutocomplete: true,
    zoom: 100,
  },
  layout: {
    sidebarPosition: 'right',
    sidebarCollapsed: false,
    toolbarPosition: 'top',
    navigatorVisibility: 'auto',
    distractionFreeMode: false,
    compactMode: false,
    showStats: true,
    layoutMode: 'modern',
  },
  export: {
    defaultFormat: 'pdf',
    paperSize: 'letter',
    includeWatermark: false,
    watermarkText: 'DRAFT',
    showSceneNumbers: true,
    sceneNumberSide: 'both',
    includeHeader: false,
    headerText: '',
    includeFooter: false,
    footerText: '',
    revisionColors: false,
  },
  shortcuts: {
    save: 'Mod+S',
    undo: 'Mod+Z',
    redo: 'Mod+Shift+Z',
    find: 'Mod+F',
    replace: 'Mod+H',
    commandPalette: 'Mod+K',
    newScreenplay: 'Mod+N',
    settings: 'Mod+,',
    distractionFree: 'Mod+Shift+F',
    insertScene: 'Mod+Shift+S',
    insertCharacter: 'Mod+Shift+C',
    insertDialogue: 'Mod+Shift+D',
    insertAction: 'Mod+Shift+A',
    insertTransition: 'Mod+Shift+T',
    insertParenthetical: 'Mod+Shift+P',
  },
};

export const themePresets: Record<ThemePreset, Partial<VisualSettings>> = {
  // Minimal: Clean neutral grayscale - no color tint
  minimal: {
    themePreset: 'minimal',
    lightColors: {
      background: '0 0% 99%',             // Pure off-white
      foreground: '0 0% 32%',             // Neutral dark gray
      card: '0 0% 100%',
      cardForeground: '0 0% 32%',
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
    borderRadius: 12,
    useGlassEffect: true,
  },
  // Warm: Terracotta accent - cozy and inviting
  warm: {
    themePreset: 'warm',
    lightColors: {
      background: '40 33% 98%',           // Warm off-white
      foreground: '30 8% 38%',            // Soft warm brown
      card: '0 0% 100%',
      cardForeground: '30 8% 38%',
      primary: '24 60% 50%',              // Warm terracotta
      primaryForeground: '0 0% 100%',
      secondary: '37 15% 94%',
      secondaryForeground: '30 8% 42%',
      muted: '37 15% 94%',
      mutedForeground: '30 6% 55%',
      accent: '37 20% 92%',
      accentForeground: '30 8% 38%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '37 15% 88%',
      input: '37 15% 88%',
      ring: '24 50% 50%',
    },
    darkColors: {
      background: '30 15% 10%',           // Warm charcoal
      foreground: '40 12% 72%',           // Soft warm cream
      card: '30 12% 13%',
      cardForeground: '40 12% 72%',
      primary: '24 55% 55%',              // Brighter terracotta
      primaryForeground: '30 15% 10%',
      secondary: '30 10% 18%',
      secondaryForeground: '40 12% 68%',
      muted: '30 10% 18%',
      mutedForeground: '30 8% 48%',
      accent: '30 12% 20%',
      accentForeground: '40 12% 72%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '30 10% 22%',
      input: '30 10% 22%',
      ring: '24 50% 55%',
    },
    uiFont: 'inter',
    borderRadius: 12,
    useGlassEffect: false,
  },
  // Midnight: Deep charcoal with amber accents
  midnight: {
    themePreset: 'midnight',
    lightColors: {
      background: '35 18% 98%',           // Warm off-white
      foreground: '30 10% 32%',           // Soft warm charcoal
      card: '0 0% 100%',
      cardForeground: '30 10% 32%',
      primary: '32 70% 48%',              // Amber/golden
      primaryForeground: '0 0% 100%',
      secondary: '35 15% 95%',
      secondaryForeground: '30 10% 35%',
      muted: '35 15% 95%',
      mutedForeground: '30 6% 50%',
      accent: '32 50% 94%',               // Soft amber
      accentForeground: '32 70% 35%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '35 12% 88%',
      input: '35 12% 88%',
      ring: '32 70% 48%',
    },
    darkColors: {
      background: '28 18% 8%',            // Deep warm charcoal
      foreground: '35 12% 74%',           // Soft warm cream
      card: '28 16% 10%',
      cardForeground: '35 12% 74%',
      primary: '36 75% 55%',              // Bright amber
      primaryForeground: '28 20% 8%',
      secondary: '28 14% 14%',
      secondaryForeground: '35 12% 70%',
      muted: '28 14% 14%',
      mutedForeground: '30 8% 50%',
      accent: '32 60% 20%',
      accentForeground: '36 70% 85%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '28 12% 18%',
      input: '28 12% 18%',
      ring: '36 75% 55%',
    },
    uiFont: 'inter',
    borderRadius: 8,
    useGlassEffect: false,
  },
  // Paper: Classic neutral paper - subtle and refined
  paper: {
    themePreset: 'paper',
    lightColors: {
      background: '40 8% 98%',            // Neutral off-white
      foreground: '0 0% 28%',             // Neutral dark gray
      card: '40 5% 99%',
      cardForeground: '0 0% 28%',
      primary: '0 0% 22%',                // Near black
      primaryForeground: '0 0% 100%',
      secondary: '40 5% 96%',
      secondaryForeground: '0 0% 32%',
      muted: '40 5% 96%',
      mutedForeground: '0 0% 48%',
      accent: '40 6% 94%',
      accentForeground: '0 0% 28%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '40 5% 90%',
      input: '40 5% 90%',
      ring: '0 0% 22%',
    },
    darkColors: {
      background: '0 0% 6%',              // Near black
      foreground: '0 0% 70%',             // Soft gray
      card: '0 0% 8%',
      cardForeground: '0 0% 70%',
      primary: '0 0% 82%',                // Light gray primary
      primaryForeground: '0 0% 8%',
      secondary: '0 0% 12%',
      secondaryForeground: '0 0% 68%',
      muted: '0 0% 12%',
      mutedForeground: '0 0% 46%',
      accent: '0 0% 14%',
      accentForeground: '0 0% 70%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 16%',
      input: '0 0% 16%',
      ring: '0 0% 70%',
    },
    uiFont: 'geist',
    borderRadius: 6,
    useGlassEffect: false,
  },
  custom: {
    themePreset: 'custom',
    // Will use user-defined colors
  },
};
