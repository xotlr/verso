export type ThemePreset =
  | 'minimal'  // Essential
  | 'romance'  // Essential
  | 'matcha' | 'neovictorian'  // Vintage
  | 'horror';  // Genre

export interface ThemeMetadata {
  name: string;
  subtitle: string;
}

export const themeMetadata: Record<ThemePreset, ThemeMetadata> = {
  // Essential themes
  minimal: { name: 'Minimal', subtitle: 'Clean and focused' },
  romance: { name: 'Romance', subtitle: 'Soft and heartfelt' },
  // Vintage themes
  matcha: { name: 'Matcha', subtitle: 'Chinese retro charm' },
  neovictorian: { name: 'Neovictorian', subtitle: 'European vintage' },
  // Genre themes
  horror: { name: 'Horror', subtitle: 'Dark and eerie' },
};

export type UIFont = 'inter' | 'sf-pro' | 'geist' | 'ibm-plex' | 'plus-jakarta';
export type ScreenplayFont = 'courier-prime' | 'courier-new' | 'courier-final-draft';

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
  autocomplete: AutocompleteSettings;
  textContrast: number; // 15-35, default 25 (lightness percentage)
}

export interface LayoutSettings {
  layoutMode: LayoutMode;
}

export interface ExportSettings {
  defaultFormat: 'pdf' | 'fdx' | 'fountain' | 'txt' | 'html';
  paperSize: 'letter' | 'a4';
}

export interface AppSettings {
  visual: VisualSettings;
  editor: EditorSettings;
  layout: LayoutSettings;
  export: ExportSettings;
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
    autocomplete: {
      enabled: true,
      delayMs: 5000, // 5 second delay by default
    },
    textContrast: 25, // Default lightness percentage
  },
  layout: {
    layoutMode: 'classic',
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
    borderRadius: 9,
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
