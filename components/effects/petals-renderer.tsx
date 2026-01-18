'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { Petals } from './petals';

// Themes that have petals enabled by default
const PETAL_THEMES = ['maelle'] as const;

/**
 * PetalsRenderer
 * Wrapper component that reads settings context and conditionally renders
 * the Petals ambient effect. Auto-enables for certain themes (like Maelle).
 */
export function PetalsRenderer() {
  const { settings } = useSettings();
  const petals = settings.visual.petals;
  const themePreset = settings.visual.themePreset;
  const reduceMotion = settings.interface.reduceMotion;

  // Track theme state via effect to avoid hydration mismatch
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Set initial dark mode state
    setIsDark(document.documentElement.classList.contains('dark'));

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Auto-enable for Maelle theme (petal themes always show petals)
  // For other themes: only enabled if user explicitly enabled
  // Disable if user has reduce motion enabled in settings
  const isPetalTheme = PETAL_THEMES.includes(themePreset as typeof PETAL_THEMES[number]);
  const isEnabled = !reduceMotion && (isPetalTheme || petals?.enabled === true);

  if (!isEnabled) {
    return null;
  }

  // Get primary color from current theme for 'primary' palette
  const colors = isDark ? settings.visual.darkColors : settings.visual.lightColors;
  const primaryColor = colors?.primary;

  return (
    <Petals
      count={petals?.intensity ?? 60}
      palette={petals?.palette ?? 'sakura'}
      primaryColor={primaryColor}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    />
  );
}
