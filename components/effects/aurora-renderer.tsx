'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { AuroraBackground } from './aurora-background';

// Themes that have aurora enabled by default
const AURORA_THEMES = ['limitless'] as const;

/**
 * AuroraRenderer
 * Wrapper component that reads settings context and conditionally renders
 * the Aurora WebGL background effect. Auto-enables for the Limitless theme.
 */
export function AuroraRenderer() {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const themePreset = settings.visual.themePreset;
  const premium = settings.visual.premium;
  const reduceMotion = settings.interface.reduceMotion;

  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check system reduced motion preference on mount
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Check if aurora effect is enabled
  const isAuroraTheme = AURORA_THEMES.includes(themePreset as typeof AURORA_THEMES[number]);
  const hasAuroraEffect = premium?.ambientEffect === 'aurora';

  // Enable if theme matches OR explicit aurora effect is set
  // Disable if user prefers reduced motion
  const isEnabled = !reduceMotion && !prefersReducedMotion && (isAuroraTheme || hasAuroraEffect);

  // Don't render on server or if not enabled
  if (!mounted || !isEnabled) {
    return null;
  }

  return <AuroraBackground />;
}
