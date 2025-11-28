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
  updateShortcuts: (updates: Partial<AppSettings['shortcuts']>) => void;
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
        // Merge with defaults to ensure all fields exist
        setSettings({
          ...defaultSettings,
          ...parsed,
          visual: {
            ...defaultSettings.visual,
            ...parsed.visual,
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
          editor: { ...defaultSettings.editor, ...parsed.editor },
          layout: { ...defaultSettings.layout, ...parsed.layout },
          export: { ...defaultSettings.export, ...parsed.export },
          shortcuts: { ...defaultSettings.shortcuts, ...parsed.shortcuts },
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
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
  }, [settings, isLoaded]);

  const applyThemeVariables = useCallback((settings: AppSettings) => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const colors = isDark ? settings.visual.darkColors : settings.visual.lightColors;

    // Apply color variables (convert camelCase to kebab-case)
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply other visual settings
    root.style.setProperty('--radius', `${settings.visual.borderRadius / 16}rem`);
    root.style.setProperty('--animation-speed', `${settings.visual.animationSpeed}s`);
    root.style.setProperty('--font-size', `${settings.visual.fontSize}px`);

    // Apply font classes
    root.setAttribute('data-ui-font', settings.visual.uiFont);
    root.setAttribute('data-screenplay-font', settings.visual.screenplayFont);
  }, []);

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

  const updateShortcuts = useCallback((updates: Partial<AppSettings['shortcuts']>) => {
    setSettings((prev) => {
      const newShortcuts = { ...prev.shortcuts };
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          newShortcuts[key] = value;
        }
      });
      return { ...prev, shortcuts: newShortcuts };
    });
  }, []);

  const setThemePreset = useCallback((preset: ThemePreset) => {
    const presetSettings = themePresets[preset];
    if (presetSettings) {
      updateVisualSettings(presetSettings);
    }
  }, [updateVisualSettings]);

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
        editor: { ...defaultSettings.editor, ...parsed.editor },
        layout: { ...defaultSettings.layout, ...parsed.layout },
        export: { ...defaultSettings.export, ...parsed.export },
        shortcuts: { ...defaultSettings.shortcuts, ...parsed.shortcuts },
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
    updateShortcuts,
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
