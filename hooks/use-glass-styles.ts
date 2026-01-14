'use client';

import { useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { cn } from '@/lib/utils';

/**
 * Hook for glass morphism styling based on theme preset.
 * Returns consistent glass vs solid styling for the Limitless theme.
 *
 * @example
 * ```tsx
 * const { isGlass, glassContainer, solidContainer } = useGlassStyles();
 *
 * return (
 *   <div className={isGlass ? glassContainer : solidContainer}>
 *     ...
 *   </div>
 * );
 * ```
 */
export function useGlassStyles() {
  const { settings } = useSettings();
  const isGlass = settings.visual.themePreset === 'limitless';

  const styles = useMemo(() => ({
    /**
     * Whether the current theme is glass/limitless
     */
    isGlass,

    /**
     * Glass container style (transparent with blur)
     * Use for containers, cards, panels in Limitless theme
     */
    glassContainer: cn(
      'bg-white/40 dark:bg-black/20',
      'backdrop-blur-md',
      'border border-white/30 dark:border-white/10'
    ),

    /**
     * Solid container style (opaque)
     * Use for containers, cards, panels in non-Limitless themes
     */
    solidContainer: cn(
      'bg-muted',
      'border border-border/60'
    ),

    /**
     * Get container class based on current theme
     */
    container: isGlass
      ? cn(
          'bg-white/40 dark:bg-black/20',
          'backdrop-blur-md',
          'border border-white/30 dark:border-white/10'
        )
      : cn(
          'bg-muted',
          'border border-border/60'
        ),

    /**
     * Glass-aware button hover states
     */
    buttonHover: isGlass
      ? 'text-muted-foreground hover:text-foreground hover:bg-background/40'
      : 'hover:bg-accent hover:text-accent-foreground',

    /**
     * Glass-aware active/pressed button state
     */
    buttonActive: isGlass
      ? 'bg-background/80 shadow-sm text-foreground'
      : 'bg-primary text-primary-foreground font-medium',

  }), [isGlass]);

  return styles;
}

/**
 * Simpler hook that just returns the isGlass boolean.
 * Use when you only need to check if glass styling is active.
 */
export function useIsGlass(): boolean {
  const { settings } = useSettings();
  return settings.visual.themePreset === 'limitless';
}
