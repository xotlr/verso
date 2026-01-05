'use client';

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

  // Auto-enable for Maelle theme, or use explicit setting
  const isPetalTheme = PETAL_THEMES.includes(themePreset as typeof PETAL_THEMES[number]);
  const isEnabled = petals?.enabled ?? isPetalTheme;

  if (!isEnabled) {
    return null;
  }

  // Get primary color from current theme for 'primary' palette
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
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
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
