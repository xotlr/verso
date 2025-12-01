export type ThemePreset =
  | 'minimal' | 'warm' | 'midnight' | 'paper'  // Classic themes
  | 'noir' | 'romance' | 'fantasy' | 'sci-fi' | 'horror';  // Genre themes

export interface ThemeMetadata {
  name: string;
  subtitle: string;
}

export const themeMetadata: Record<ThemePreset, ThemeMetadata> = {
  // Classic themes
  minimal: { name: 'Minimal', subtitle: 'Clean and focused' },
  warm: { name: 'Warm', subtitle: 'Cozy and inviting' },
  midnight: { name: 'Midnight', subtitle: 'Starlit serenity' },
  paper: { name: 'Paper', subtitle: 'Classic neutral' },
  // Genre themes
  noir: { name: 'Noir', subtitle: 'Shadows and smoke' },
  romance: { name: 'Romance', subtitle: 'Soft and heartfelt' },
  fantasy: { name: 'Fantasy', subtitle: 'Enchanted realms' },
  'sci-fi': { name: 'Sci-Fi', subtitle: 'Future forward' },
  horror: { name: 'Horror', subtitle: 'Blood and darkness' },
};

export type UIFont = 'inter' | 'sf-pro' | 'geist' | 'ibm-plex';
export type ScreenplayFont = 'courier-prime' | 'courier-new' | 'courier-final-draft';

export type SidebarPosition = 'left' | 'right' | 'hidden';
export type ToolbarPosition = 'top' | 'bottom' | 'floating' | 'hidden';
export type NavigatorVisibility = 'always' | 'auto' | 'hidden';
export type LayoutMode = 'modern' | 'classic';

export type ExportFormat = 'pdf' | 'fdx' | 'fountain' | 'txt' | 'html';
export type PaperSize = 'letter' | 'a4' | 'legal';

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
}

export interface AutocompleteSettings {
  enabled: boolean;
  delayMs: number; // 0 = immediate, 5000 = 5 seconds
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
  enableAutocomplete: boolean; // Deprecated: use autocomplete.enabled instead
  autocomplete: AutocompleteSettings;
  zoom: number; // 50-200, default 100
  textContrast: number; // 15-35, default 25 (lightness percentage)
  lineHeightDensity: 'compact' | 'normal' | 'relaxed'; // 1.1, 1.15, 1.2
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
    themePreset: 'minimal',
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
    autocomplete: {
      enabled: true,
      delayMs: 5000, // 5 second delay by default
    },
    zoom: 100,
    textContrast: 25, // Default lightness percentage
    lineHeightDensity: 'normal', // Default to 1.15 line height
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
  },
  // Midnight: Deep navy/indigo with silver starlight - truly nocturnal
  midnight: {
    themePreset: 'midnight',
    lightColors: {
      background: '222 25% 97%',          // Cool slate white
      foreground: '222 20% 28%',          // Deep navy text
      card: '222 20% 99%',
      cardForeground: '222 20% 28%',
      primary: '222 50% 45%',             // Deep indigo
      primaryForeground: '0 0% 100%',
      secondary: '222 15% 94%',
      secondaryForeground: '222 18% 32%',
      muted: '222 15% 94%',
      mutedForeground: '222 10% 48%',
      accent: '220 30% 92%',              // Soft blue
      accentForeground: '222 20% 28%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '222 15% 88%',
      input: '222 15% 88%',
      ring: '222 50% 45%',
    },
    darkColors: {
      background: '222 47% 6%',           // True midnight navy
      foreground: '220 20% 75%',          // Silver starlight
      card: '222 40% 9%',
      cardForeground: '220 20% 75%',
      primary: '220 40% 65%',             // Soft moonlight blue
      primaryForeground: '222 47% 6%',
      secondary: '222 35% 12%',
      secondaryForeground: '220 18% 70%',
      muted: '222 35% 12%',
      mutedForeground: '222 15% 45%',
      accent: '220 50% 18%',
      accentForeground: '220 30% 85%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '222 30% 15%',
      input: '222 30% 15%',
      ring: '220 40% 65%',
    },
    uiFont: 'inter',
    borderRadius: 8,
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
  },

  // ============================================
  // GENRE THEMES - Mood-based writing environments
  // ============================================

  // Noir: Shadows and smoke - true black, high contrast, dramatic golden accents
  noir: {
    themePreset: 'noir',
    lightColors: {
      background: '0 0% 97%',             // Near white
      foreground: '0 0% 12%',             // Near black text
      card: '0 0% 100%',
      cardForeground: '0 0% 12%',
      primary: '0 0% 8%',                 // Deep black
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 94%',
      secondaryForeground: '0 0% 15%',
      muted: '0 0% 94%',
      mutedForeground: '0 0% 40%',
      accent: '45 80% 92%',               // Soft gold
      accentForeground: '0 0% 12%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 88%',
      input: '0 0% 88%',
      ring: '45 70% 45%',
    },
    darkColors: {
      background: '0 0% 4%',              // True black
      foreground: '0 0% 92%',             // Stark white
      card: '0 0% 7%',
      cardForeground: '0 0% 92%',
      primary: '45 80% 52%',              // Film noir gold
      primaryForeground: '0 0% 4%',
      secondary: '0 0% 10%',
      secondaryForeground: '0 0% 88%',
      muted: '0 0% 10%',
      mutedForeground: '0 0% 50%',
      accent: '45 60% 15%',
      accentForeground: '45 80% 90%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 0% 14%',
      input: '0 0% 14%',
      ring: '45 80% 52%',
    },
    lightVisualization: {
      beatColors: [
        '#1F2937', '#374151', '#6B7280', '#D4A574',
        '#111827', '#4B5563', '#9CA3AF', '#B8860B',
      ],
      actColors: {
        act1: { bg: 'rgba(31, 41, 55, 0.1)', border: 'rgba(31, 41, 55, 0.3)' },
        act2a: { bg: 'rgba(212, 165, 116, 0.1)', border: 'rgba(212, 165, 116, 0.3)' },
        act2b: { bg: 'rgba(184, 134, 11, 0.1)', border: 'rgba(184, 134, 11, 0.3)' },
        act3: { bg: 'rgba(75, 85, 99, 0.1)', border: 'rgba(75, 85, 99, 0.3)' },
      },
      sceneColors: [
        '#1F2937', '#374151', '#6B7280', '#D4A574',
        '#111827', '#4B5563', '#B8860B', '#57534E',
      ],
      characterColors: [
        '#1F2937', '#D4A574', '#374151', '#B8860B', '#6B7280',
        '#57534E', '#111827', '#A3A3A3', '#4B5563', '#9CA3AF',
      ],
      locationColors: [
        '#4B5563', '#6B7280', '#57534E', '#374151', '#737373',
        '#9CA3AF', '#A3A3A3', '#78716C', '#6B7280', '#8B8B8B',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#E5E7EB', '#D1D5DB', '#F5F5F5', '#FBBF24',
        '#9CA3AF', '#F3F4F6', '#FFFFFF', '#F59E0B',
      ],
      actColors: {
        act1: { bg: 'rgba(229, 231, 235, 0.12)', border: 'rgba(229, 231, 235, 0.35)' },
        act2a: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)' },
        act2b: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
        act3: { bg: 'rgba(209, 213, 219, 0.12)', border: 'rgba(209, 213, 219, 0.35)' },
      },
      sceneColors: [
        '#E5E7EB', '#D1D5DB', '#F5F5F5', '#FBBF24',
        '#9CA3AF', '#F3F4F6', '#F59E0B', '#D6D3D1',
      ],
      characterColors: [
        '#E5E7EB', '#FBBF24', '#D1D5DB', '#F59E0B', '#F5F5F5',
        '#D6D3D1', '#9CA3AF', '#FFFFFF', '#F3F4F6', '#E5E5E5',
      ],
      locationColors: [
        '#9CA3AF', '#D1D5DB', '#D6D3D1', '#E5E7EB', '#A3A3A3',
        '#E5E5E5', '#F3F4F6', '#E7E5E4', '#F5F5F5', '#D4D4D4',
      ],
    },
    uiFont: 'geist',
    borderRadius: 4,
    cursor: {
      mode: 'line',
      blinkStyle: 'smooth',
      blinkSpeed: 600,
      color: '45 80% 52%',  // Gold to match noir accent
      glowEnabled: true,
      glowIntensity: 0.4,
      width: 2,
    },
  },

  // Romance: Soft and heartfelt - warm, inviting, gentle on eyes
  romance: {
    themePreset: 'romance',
    lightColors: {
      background: '350 25% 98%',          // Blush white
      foreground: '350 12% 35%',          // Soft mauve
      card: '350 20% 99%',
      cardForeground: '350 12% 35%',
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

  // Fantasy: Enchanted realms - purple/gold mystical, ethereal atmosphere
  fantasy: {
    themePreset: 'fantasy',
    lightColors: {
      background: '270 20% 98%',          // Soft lavender white
      foreground: '270 15% 28%',          // Deep purple-gray
      card: '270 15% 99%',
      cardForeground: '270 15% 28%',
      primary: '280 60% 50%',             // Magic purple
      primaryForeground: '0 0% 100%',
      secondary: '270 15% 95%',
      secondaryForeground: '270 12% 32%',
      muted: '270 15% 95%',
      mutedForeground: '270 10% 48%',
      accent: '45 70% 90%',               // Soft gold
      accentForeground: '270 15% 28%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '270 12% 90%',
      input: '270 12% 90%',
      ring: '280 60% 50%',
    },
    darkColors: {
      background: '270 30% 7%',           // Deep forest purple
      foreground: '270 15% 78%',          // Soft lavender
      card: '270 25% 10%',
      cardForeground: '270 15% 78%',
      primary: '45 70% 58%',              // Enchanted gold
      primaryForeground: '270 30% 7%',
      secondary: '270 20% 14%',
      secondaryForeground: '270 12% 72%',
      muted: '270 20% 14%',
      mutedForeground: '270 10% 46%',
      accent: '280 50% 22%',
      accentForeground: '280 40% 85%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '270 18% 18%',
      input: '270 18% 18%',
      ring: '45 70% 58%',
    },
    lightVisualization: {
      beatColors: [
        '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE',
        '#D97706', '#F59E0B', '#FBBF24', '#FCD34D',
      ],
      actColors: {
        act1: { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
        act2a: { bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.3)' },
        act2b: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
        act3: { bg: 'rgba(167, 139, 250, 0.1)', border: 'rgba(167, 139, 250, 0.3)' },
      },
      sceneColors: [
        '#8B5CF6', '#A78BFA', '#C4B5FD', '#D97706',
        '#F59E0B', '#FBBF24', '#7C3AED', '#6D28D9',
      ],
      characterColors: [
        '#8B5CF6', '#D97706', '#A78BFA', '#F59E0B', '#C4B5FD',
        '#FBBF24', '#7C3AED', '#FCD34D', '#6D28D9', '#DDD6FE',
      ],
      locationColors: [
        '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF', '#A78BFA',
        '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE',
        '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7',
      ],
      actColors: {
        act1: { bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.4)' },
        act2a: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)' },
        act2b: { bg: 'rgba(252, 211, 77, 0.15)', border: 'rgba(252, 211, 77, 0.4)' },
        act3: { bg: 'rgba(196, 181, 253, 0.15)', border: 'rgba(196, 181, 253, 0.4)' },
      },
      sceneColors: [
        '#A78BFA', '#C4B5FD', '#DDD6FE', '#FBBF24',
        '#FCD34D', '#FDE68A', '#8B5CF6', '#7C3AED',
      ],
      characterColors: [
        '#A78BFA', '#FBBF24', '#C4B5FD', '#FCD34D', '#DDD6FE',
        '#FDE68A', '#8B5CF6', '#FEF3C7', '#7C3AED', '#EDE9FE',
      ],
      locationColors: [
        '#DDD6FE', '#EDE9FE', '#F5F3FF', '#FAF5FF', '#C4B5FD',
        '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B',
      ],
    },
    uiFont: 'inter',
    borderRadius: 12,
    cursor: {
      mode: 'native',
      blinkStyle: 'smooth',
      blinkSpeed: 530,
      color: '45 70% 58%',  // Gold to match fantasy theme
      glowEnabled: true,
      glowIntensity: 0.35,
      width: 2,
    },
  },

  // Sci-Fi: Future forward - cool, precise, modern tech aesthetic
  'sci-fi': {
    themePreset: 'sci-fi',
    lightColors: {
      background: '200 20% 98%',          // Cool white
      foreground: '200 15% 28%',          // Slate
      card: '200 15% 99%',
      cardForeground: '200 15% 28%',
      primary: '195 75% 45%',             // Cyan
      primaryForeground: '0 0% 100%',
      secondary: '200 15% 95%',
      secondaryForeground: '200 12% 32%',
      muted: '200 15% 95%',
      mutedForeground: '200 10% 48%',
      accent: '195 40% 92%',
      accentForeground: '200 15% 28%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '200 12% 90%',
      input: '200 12% 90%',
      ring: '195 75% 45%',
    },
    darkColors: {
      background: '200 30% 7%',           // Deep teal-black
      foreground: '195 15% 78%',          // Light cyan
      card: '200 25% 9%',
      cardForeground: '195 15% 78%',
      primary: '195 70% 52%',             // Bright cyan
      primaryForeground: '200 30% 7%',
      secondary: '200 20% 13%',
      secondaryForeground: '195 12% 72%',
      muted: '200 20% 13%',
      mutedForeground: '200 10% 46%',
      accent: '195 40% 18%',
      accentForeground: '195 15% 78%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '200 18% 18%',
      input: '200 18% 18%',
      ring: '195 70% 52%',
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

  // Horror: Blood and darkness - crimson red, void black, eerie atmosphere
  horror: {
    themePreset: 'horror',
    lightColors: {
      background: '0 5% 97%',             // Pale bone white
      foreground: '0 10% 20%',            // Near black text
      card: '0 5% 99%',
      cardForeground: '0 10% 20%',
      primary: '0 70% 45%',               // Blood red
      primaryForeground: '0 0% 100%',
      secondary: '0 5% 94%',
      secondaryForeground: '0 8% 25%',
      muted: '0 5% 94%',
      mutedForeground: '0 5% 45%',
      accent: '0 40% 92%',                // Soft crimson
      accentForeground: '0 10% 20%',
      destructive: '0 80% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 5% 88%',
      input: '0 5% 88%',
      ring: '0 70% 45%',
    },
    darkColors: {
      background: '0 0% 3%',              // Void black
      foreground: '30 10% 82%',           // Bone white
      card: '0 15% 6%',
      cardForeground: '30 10% 82%',
      primary: '0 70% 48%',               // Blood red
      primaryForeground: '0 0% 100%',
      secondary: '0 12% 10%',
      secondaryForeground: '30 8% 75%',
      muted: '0 12% 10%',
      mutedForeground: '0 5% 45%',
      accent: '0 50% 15%',
      accentForeground: '0 40% 90%',
      destructive: '0 80% 50%',
      destructiveForeground: '0 0% 100%',
      border: '0 10% 14%',
      input: '0 10% 14%',
      ring: '0 70% 48%',
    },
    lightVisualization: {
      beatColors: [
        '#DC2626', '#EF4444', '#F87171', '#FCA5A5',
        '#1F2937', '#374151', '#4B5563', '#6B7280',
      ],
      actColors: {
        act1: { bg: 'rgba(220, 38, 38, 0.1)', border: 'rgba(220, 38, 38, 0.3)' },
        act2a: { bg: 'rgba(31, 41, 55, 0.1)', border: 'rgba(31, 41, 55, 0.3)' },
        act2b: { bg: 'rgba(55, 65, 81, 0.1)', border: 'rgba(55, 65, 81, 0.3)' },
        act3: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
      },
      sceneColors: [
        '#DC2626', '#EF4444', '#F87171', '#1F2937',
        '#374151', '#4B5563', '#B91C1C', '#991B1B',
      ],
      characterColors: [
        '#DC2626', '#1F2937', '#EF4444', '#374151', '#F87171',
        '#4B5563', '#B91C1C', '#6B7280', '#991B1B', '#9CA3AF',
      ],
      locationColors: [
        '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#374151',
        '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#F87171', '#EF4444', '#DC2626', '#B91C1C',
        '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563',
      ],
      actColors: {
        act1: { bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.4)' },
        act2a: { bg: 'rgba(209, 213, 219, 0.12)', border: 'rgba(209, 213, 219, 0.35)' },
        act2b: { bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.35)' },
        act3: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
      },
      sceneColors: [
        '#F87171', '#EF4444', '#DC2626', '#D1D5DB',
        '#9CA3AF', '#6B7280', '#FCA5A5', '#B91C1C',
      ],
      characterColors: [
        '#F87171', '#D1D5DB', '#EF4444', '#9CA3AF', '#DC2626',
        '#6B7280', '#FCA5A5', '#4B5563', '#B91C1C', '#E5E7EB',
      ],
      locationColors: [
        '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#4B5563',
        '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C',
      ],
    },
    uiFont: 'geist',
    borderRadius: 4,
    cursor: {
      mode: 'line',
      blinkStyle: 'blink',
      blinkSpeed: 700,
      color: '0 70% 48%',  // Blood red to match horror theme
      glowEnabled: true,
      glowIntensity: 0.5,
      width: 2,
    },
  },
};
