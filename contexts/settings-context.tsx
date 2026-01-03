'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppSettings, defaultSettings, themePresets, ThemePreset } from '@/types/settings';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateVisualSettings: (updates: Partial<AppSettings['visual']>) => void;
  updateEditorSettings: (updates: Partial<AppSettings['editor']>) => void;
  updateLayoutSettings: (updates: Partial<AppSettings['layout']>) => void;
  updateExportSettings: (updates: Partial<AppSettings['export']>) => void;
  updateInterfaceSettings: (updates: Partial<AppSettings['interface']>) => void;
  setThemePreset: (preset: ThemePreset) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_KEY = 'verso-settings-v1';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate theme preset, fallback to verso if invalid
        const storedPreset = parsed.visual?.themePreset;
        const validThemePreset = storedPreset && storedPreset in themePresets
          ? storedPreset
          : defaultSettings.visual.themePreset;
        // Merge with defaults to ensure all fields exist
        setSettings({
          ...defaultSettings,
          ...parsed,
          visual: {
            ...defaultSettings.visual,
            ...parsed.visual,
            // Use validated theme preset
            themePreset: validThemePreset,
            // Deep merge visualization palettes
            lightVisualization: {
              ...defaultSettings.visual.lightVisualization,
              ...(parsed.visual?.lightVisualization || {}),
            },
            darkVisualization: {
              ...defaultSettings.visual.darkVisualization,
              ...(parsed.visual?.darkVisualization || {}),
            },
            // Deep merge cursor settings
            cursor: {
              ...defaultSettings.visual.cursor,
              ...(parsed.visual?.cursor || {}),
            },
          },
          editor: {
            ...defaultSettings.editor,
            ...parsed.editor,
            autocomplete: {
              ...defaultSettings.editor.autocomplete,
              ...(parsed.editor?.autocomplete || {}),
            },
          },
          layout: { ...defaultSettings.layout, ...parsed.layout },
          export: { ...defaultSettings.export, ...parsed.export },
          interface: { ...defaultSettings.interface, ...parsed.interface },
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const applyThemeVariables = useCallback((settings: AppSettings) => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const colors = isDark ? settings.visual.darkColors : settings.visual.lightColors;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Apply color variables (convert camelCase to kebab-case)
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply sidebar colors (derived from main theme colors)
    root.style.setProperty('--sidebar-background', colors.background);
    root.style.setProperty('--sidebar-foreground', colors.foreground);
    root.style.setProperty('--sidebar-primary', colors.primary);
    root.style.setProperty('--sidebar-primary-foreground', colors.primaryForeground);
    root.style.setProperty('--sidebar-accent', colors.accent);
    root.style.setProperty('--sidebar-accent-foreground', colors.accentForeground);
    root.style.setProperty('--sidebar-border', colors.border);
    root.style.setProperty('--sidebar-ring', colors.ring);

    // Apply other visual settings
    root.style.setProperty('--radius', `${settings.visual.borderRadius / 16}rem`);
    root.style.setProperty('--animation-speed', `${settings.visual.animationSpeed}s`);
    root.style.setProperty('--font-size', `${settings.visual.fontSize}px`);

    // Apply display scale (zoom) for accessibility
    const scale = settings.interface.displayScale ?? 1.0;
    root.style.setProperty('--display-scale', String(scale));
    root.style.fontSize = `${scale * 100}%`;

    // Apply accessibility settings
    if (settings.interface.reduceMotion) {
      root.setAttribute('data-reduce-motion', 'true');
    } else {
      root.removeAttribute('data-reduce-motion');
    }
    if (settings.interface.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    // Apply editor-specific settings (textContrast is a number 15-35)
    root.style.setProperty('--pm-text-lightness', String(settings.editor.textContrast));

    // Line height is fixed at 16px for proper pagination (matches wasm-inspired editor)
    // The density setting no longer affects screenplay line height
    root.style.setProperty('--pm-line-height', '16px');

    // Apply font classes
    root.setAttribute('data-ui-font', settings.visual.uiFont);
    root.setAttribute('data-header-font', settings.visual.headerFont || 'default');
    root.setAttribute('data-screenplay-font', settings.visual.screenplayFont);

    // Apply app font override (affects entire UI)
    const appFont = settings.interface.appFont;
    if (appFont && appFont !== 'default') {
      root.setAttribute('data-app-font', appFont);
    } else {
      root.removeAttribute('data-app-font');
    }

    // Apply editor font override (affects only screenplay editor)
    const editorFont = settings.interface.editorFont;
    if (editorFont && editorFont !== 'default') {
      root.setAttribute('data-editor-font', editorFont);
    } else {
      root.removeAttribute('data-editor-font');
    }

    // Apply premium theme attributes
    root.setAttribute('data-theme-preset', settings.visual.themePreset);

    // Apply premium features if present
    const premium = settings.visual.premium;
    if (premium) {
      // UI Chrome style
      if (premium.uiChrome && premium.uiChrome !== 'default') {
        root.setAttribute('data-ui-chrome', premium.uiChrome);
      } else {
        root.removeAttribute('data-ui-chrome');
      }

      // Ambient effect (respect reduced motion preference)
      const shouldApplyAmbient = !prefersReducedMotion &&
                                  !settings.interface.reduceMotion &&
                                  premium.ambientEffect &&
                                  premium.ambientEffect !== 'none';
      if (shouldApplyAmbient) {
        root.setAttribute('data-ambient-effect', premium.ambientEffect!);
        root.style.setProperty('--ambient-intensity', String(premium.ambientIntensity ?? 0.03));
      } else {
        root.removeAttribute('data-ambient-effect');
      }

      // Pattern and chrome opacity variables
      if (premium.patternOpacity !== undefined) {
        root.style.setProperty('--pattern-opacity', String(premium.patternOpacity));
      }
      if (premium.patternColor) {
        root.style.setProperty('--pattern-color', premium.patternColor);
      }
      if (premium.chromeOpacity !== undefined) {
        root.style.setProperty('--chrome-opacity', String(premium.chromeOpacity));
      }
    } else {
      // Clear premium attributes if no premium settings
      root.removeAttribute('data-ui-chrome');
      root.removeAttribute('data-ambient-effect');
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        // Apply CSS custom properties
        applyThemeVariables(settings);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  }, [settings, isLoaded, applyThemeVariables]);

  // Watch for theme changes (light/dark toggle) and re-apply colors
  useEffect(() => {
    if (!isLoaded) return;

    const root = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          applyThemeVariables(settings);
        }
      });
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    // Initial apply
    applyThemeVariables(settings);

    return () => observer.disconnect();
  }, [isLoaded, settings, applyThemeVariables]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateVisualSettings = useCallback((updates: Partial<AppSettings['visual']>) => {
    setSettings((prev) => ({
      ...prev,
      visual: { ...prev.visual, ...updates },
    }));
  }, []);

  const updateEditorSettings = useCallback((updates: Partial<AppSettings['editor']>) => {
    setSettings((prev) => ({
      ...prev,
      editor: { ...prev.editor, ...updates },
    }));
  }, []);

  const updateLayoutSettings = useCallback((updates: Partial<AppSettings['layout']>) => {
    setSettings((prev) => ({
      ...prev,
      layout: { ...prev.layout, ...updates },
    }));
  }, []);

  const updateExportSettings = useCallback((updates: Partial<AppSettings['export']>) => {
    setSettings((prev) => ({
      ...prev,
      export: { ...prev.export, ...updates },
    }));
  }, []);

  const updateInterfaceSettings = useCallback((updates: Partial<AppSettings['interface']>) => {
    setSettings((prev) => ({
      ...prev,
      interface: { ...prev.interface, ...updates },
    }));
  }, []);

  const setThemePreset = useCallback((preset: ThemePreset) => {
    const presetSettings = themePresets[preset];
    if (presetSettings) {
      // Reset to defaults first, then apply preset to ensure clean slate
      setSettings((prev) => ({
        ...prev,
        visual: {
          ...defaultSettings.visual,
          ...presetSettings,
          // Preserve user's font size preference
          fontSize: prev.visual.fontSize,
        },
      }));
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_KEY);
  }, []);

  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      setSettings({
        ...defaultSettings,
        ...parsed,
        visual: {
          ...defaultSettings.visual,
          ...parsed.visual,
          lightVisualization: {
            ...defaultSettings.visual.lightVisualization,
            ...(parsed.visual?.lightVisualization || {}),
          },
          darkVisualization: {
            ...defaultSettings.visual.darkVisualization,
            ...(parsed.visual?.darkVisualization || {}),
          },
          cursor: {
            ...defaultSettings.visual.cursor,
            ...(parsed.visual?.cursor || {}),
          },
        },
        editor: {
          ...defaultSettings.editor,
          ...parsed.editor,
          autocomplete: {
            ...defaultSettings.editor.autocomplete,
            ...(parsed.editor?.autocomplete || {}),
          },
        },
        layout: { ...defaultSettings.layout, ...parsed.layout },
        export: { ...defaultSettings.export, ...parsed.export },
        interface: { ...defaultSettings.interface, ...parsed.interface },
      });
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, []);

  const value: SettingsContextType = {
    settings,
    updateSettings,
    updateVisualSettings,
    updateEditorSettings,
    updateLayoutSettings,
    updateExportSettings,
    updateInterfaceSettings,
    setThemePreset,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
