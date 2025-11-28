export type ThemePreset =
  | 'minimal' | 'warm' | 'midnight' | 'paper'  // Classic themes
  | 'noir' | 'romance' | 'western' | 'sci-fi'  // Genre themes
  | 'custom';

export interface ThemeMetadata {
  name: string;
  subtitle: string;
}

export const themeMetadata: Record<ThemePreset, ThemeMetadata> = {
  // Classic themes
  minimal: { name: 'Minimal', subtitle: 'Clean and focused' },
  warm: { name: 'Warm', subtitle: 'Cozy and inviting' },
  midnight: { name: 'Midnight', subtitle: 'Deep and calm' },
  paper: { name: 'Paper', subtitle: 'Classic neutral' },
  // Genre themes
  noir: { name: 'Noir', subtitle: 'Shadows and suspense' },
  romance: { name: 'Romance', subtitle: 'Soft and heartfelt' },
  western: { name: 'Western', subtitle: 'Dusty trails' },
  'sci-fi': { name: 'Sci-Fi', subtitle: 'Future forward' },
  // Custom
  custom: { name: 'Custom', subtitle: 'Your colors' },
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
  useGlassEffect: boolean;
  cursor: CursorSettings;
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
    useGlassEffect: true,
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

  // ============================================
  // GENRE THEMES - Mood-based writing environments
  // ============================================

  // Noir: Shadows and suspense - moody, dramatic, high contrast
  noir: {
    themePreset: 'noir',
    lightColors: {
      background: '220 15% 97%',          // Cool gray
      foreground: '220 20% 20%',          // Deep blue-gray
      card: '220 10% 99%',
      cardForeground: '220 20% 20%',
      primary: '220 50% 40%',             // Steel blue
      primaryForeground: '0 0% 100%',
      secondary: '220 10% 94%',
      secondaryForeground: '220 15% 25%',
      muted: '220 10% 94%',
      mutedForeground: '220 10% 45%',
      accent: '45 60% 92%',               // Subtle amber accent
      accentForeground: '220 20% 20%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '220 10% 88%',
      input: '220 10% 88%',
      ring: '220 50% 40%',
    },
    darkColors: {
      background: '220 25% 6%',           // True dark blue-black
      foreground: '220 10% 80%',          // Cool white
      card: '220 20% 8%',
      cardForeground: '220 10% 80%',
      primary: '45 70% 55%',              // Amber accent
      primaryForeground: '220 25% 6%',
      secondary: '220 18% 12%',
      secondaryForeground: '220 10% 75%',
      muted: '220 18% 12%',
      mutedForeground: '220 8% 45%',
      accent: '45 50% 18%',
      accentForeground: '45 70% 85%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '220 15% 15%',
      input: '220 15% 15%',
      ring: '45 70% 55%',
    },
    lightVisualization: {
      beatColors: [
        '#475569', '#64748B', '#94A3B8', '#D4A574',
        '#334155', '#6B7280', '#9CA3AF', '#B8860B',
      ],
      actColors: {
        act1: { bg: 'rgba(71, 85, 105, 0.1)', border: 'rgba(71, 85, 105, 0.3)' },
        act2a: { bg: 'rgba(212, 165, 116, 0.1)', border: 'rgba(212, 165, 116, 0.3)' },
        act2b: { bg: 'rgba(184, 134, 11, 0.1)', border: 'rgba(184, 134, 11, 0.3)' },
        act3: { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)' },
      },
      sceneColors: [
        '#475569', '#64748B', '#94A3B8', '#D4A574',
        '#334155', '#6B7280', '#B8860B', '#78716C',
      ],
      characterColors: [
        '#475569', '#D4A574', '#64748B', '#B8860B', '#94A3B8',
        '#78716C', '#334155', '#A3A3A3', '#6B7280', '#9CA3AF',
      ],
      locationColors: [
        '#64748B', '#71717A', '#78716C', '#6B7280', '#737373',
        '#A1A1AA', '#A3A3A3', '#9CA3AF', '#94A3B8', '#8B8B8B',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#94A3B8', '#CBD5E1', '#E2E8F0', '#FBBF24',
        '#64748B', '#9CA3AF', '#D1D5DB', '#F59E0B',
      ],
      actColors: {
        act1: { bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)' },
        act2a: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)' },
        act2b: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
        act3: { bg: 'rgba(203, 213, 225, 0.15)', border: 'rgba(203, 213, 225, 0.4)' },
      },
      sceneColors: [
        '#94A3B8', '#CBD5E1', '#E2E8F0', '#FBBF24',
        '#64748B', '#9CA3AF', '#F59E0B', '#A8A29E',
      ],
      characterColors: [
        '#94A3B8', '#FBBF24', '#CBD5E1', '#F59E0B', '#E2E8F0',
        '#A8A29E', '#64748B', '#D4D4D4', '#9CA3AF', '#D1D5DB',
      ],
      locationColors: [
        '#94A3B8', '#A1A1AA', '#A8A29E', '#9CA3AF', '#A3A3A3',
        '#CBD5E1', '#D4D4D8', '#D6D3D1', '#D1D5DB', '#C0C0C0',
      ],
    },
    uiFont: 'geist',
    borderRadius: 6,
    useGlassEffect: false,
    cursor: {
      mode: 'native',
      blinkStyle: 'blink',
      blinkSpeed: 600,
      color: '45 70% 55%',  // Amber to match noir theme accent
      glowEnabled: true,
      glowIntensity: 0.3,
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
    useGlassEffect: true,
  },

  // Western: Dusty trails - earthy, grounded, nostalgic sepia feel
  western: {
    themePreset: 'western',
    lightColors: {
      background: '40 40% 95%',           // Aged cream
      foreground: '30 25% 28%',           // Dark sepia
      card: '40 35% 97%',
      cardForeground: '30 25% 28%',
      primary: '25 55% 45%',              // Rust
      primaryForeground: '0 0% 100%',
      secondary: '40 30% 92%',
      secondaryForeground: '30 20% 32%',
      muted: '40 30% 92%',
      mutedForeground: '30 15% 48%',
      accent: '35 35% 88%',
      accentForeground: '30 25% 28%',
      destructive: '0 65% 55%',
      destructiveForeground: '0 0% 100%',
      border: '40 25% 85%',
      input: '40 25% 85%',
      ring: '25 55% 45%',
    },
    darkColors: {
      background: '28 22% 9%',            // Dark leather
      foreground: '35 18% 72%',           // Dusty tan
      card: '28 20% 11%',
      cardForeground: '35 18% 72%',
      primary: '25 50% 52%',              // Warm rust
      primaryForeground: '28 22% 9%',
      secondary: '28 18% 15%',
      secondaryForeground: '35 15% 68%',
      muted: '28 18% 15%',
      mutedForeground: '30 12% 46%',
      accent: '25 30% 18%',
      accentForeground: '35 18% 72%',
      destructive: '0 55% 50%',
      destructiveForeground: '0 0% 100%',
      border: '28 15% 20%',
      input: '28 15% 20%',
      ring: '25 50% 52%',
    },
    lightVisualization: {
      beatColors: [
        '#A16207', '#CA8A04', '#B45309', '#92400E',
        '#78716C', '#84CC16', '#65A30D', '#4D7C0F',
      ],
      actColors: {
        act1: { bg: 'rgba(161, 98, 7, 0.1)', border: 'rgba(161, 98, 7, 0.3)' },
        act2a: { bg: 'rgba(202, 138, 4, 0.1)', border: 'rgba(202, 138, 4, 0.3)' },
        act2b: { bg: 'rgba(180, 83, 9, 0.1)', border: 'rgba(180, 83, 9, 0.3)' },
        act3: { bg: 'rgba(101, 163, 13, 0.1)', border: 'rgba(101, 163, 13, 0.3)' },
      },
      sceneColors: [
        '#A16207', '#CA8A04', '#B45309', '#92400E',
        '#78716C', '#84CC16', '#65A30D', '#4D7C0F',
      ],
      characterColors: [
        '#A16207', '#CA8A04', '#B45309', '#92400E', '#78716C',
        '#84CC16', '#65A30D', '#4D7C0F', '#57534E', '#A3A3A3',
      ],
      locationColors: [
        '#A8A29E', '#D6D3D1', '#E7E5E4', '#F5F5F4', '#78716C',
        '#D4D4D4', '#E5E5E5', '#F5F5F5', '#A3A3A3', '#CACACA',
      ],
    },
    darkVisualization: {
      beatColors: [
        '#FCD34D', '#FBBF24', '#F59E0B', '#D97706',
        '#A8A29E', '#BEF264', '#A3E635', '#84CC16',
      ],
      actColors: {
        act1: { bg: 'rgba(252, 211, 77, 0.15)', border: 'rgba(252, 211, 77, 0.4)' },
        act2a: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)' },
        act2b: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
        act3: { bg: 'rgba(163, 230, 53, 0.15)', border: 'rgba(163, 230, 53, 0.4)' },
      },
      sceneColors: [
        '#FCD34D', '#FBBF24', '#F59E0B', '#D97706',
        '#A8A29E', '#BEF264', '#A3E635', '#84CC16',
      ],
      characterColors: [
        '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#A8A29E',
        '#BEF264', '#A3E635', '#84CC16', '#78716C', '#D4D4D4',
      ],
      locationColors: [
        '#D6D3D1', '#E7E5E4', '#F5F5F4', '#FAFAF9', '#A8A29E',
        '#E5E5E5', '#F5F5F5', '#FAFAFA', '#D4D4D4', '#E0E0E0',
      ],
    },
    uiFont: 'ibm-plex',
    borderRadius: 4,
    useGlassEffect: false,
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
    useGlassEffect: true,
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

  custom: {
    themePreset: 'custom',
    // Will use user-defined colors
  },
};
