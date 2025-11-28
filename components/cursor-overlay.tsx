'use client';

import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CursorMode, CursorBlinkStyle } from '@/types/settings';

interface CursorOverlayProps {
  x: number;
  y: number;
  height: number;
  mode: CursorMode;
  blinkStyle: CursorBlinkStyle;
  blinkSpeed: number;
  color: string | null;
  glowEnabled: boolean;
  glowIntensity: number;
  width: number;
  isTyping: boolean;
  visible: boolean;
}

/**
 * Custom cursor overlay component that renders a shaped cursor (line, block, underscore)
 * with configurable animations. Memoized for performance.
 */
export const CursorOverlay = memo(function CursorOverlay({
  x,
  y,
  height,
  mode,
  blinkStyle,
  blinkSpeed,
  color,
  glowEnabled,
  glowIntensity,
  width,
  isTyping,
  visible,
}: CursorOverlayProps) {
  // All hooks must be called before any early returns
  const style = useMemo(
    () =>
      ({
        '--cursor-color': color ? `hsl(${color})` : 'hsl(var(--foreground))',
        '--cursor-glow-color': color
          ? `hsl(${color} / 0.5)`
          : 'hsl(var(--foreground) / 0.5)',
        '--cursor-blink-speed': `${blinkSpeed}ms`,
        '--cursor-width': `${width}px`,
        '--cursor-height': `${height}px`,
        '--cursor-glow-intensity': String(glowIntensity),
        transform: `translate3d(${x}px, ${y}px, 0)`,
        opacity: visible ? 1 : 0,
      }) as React.CSSProperties,
    [color, blinkSpeed, width, height, glowIntensity, x, y, visible]
  );

  const className = useMemo(
    () =>
      cn(
        'cursor-overlay',
        // Shape classes
        mode === 'line' && 'cursor-line',
        mode === 'block' && 'cursor-block',
        mode === 'underscore' && 'cursor-underscore',
        // Blink animation (disabled when typing)
        !isTyping && blinkStyle === 'blink' && 'cursor-blink-blink',
        !isTyping && blinkStyle === 'smooth' && 'cursor-blink-smooth',
        !isTyping && blinkStyle === 'expand' && 'cursor-blink-expand',
        // Typing state disables animation
        isTyping && 'cursor-typing',
        // Glow effect (disabled when typing for cleaner look)
        glowEnabled && !isTyping && 'cursor-glow'
      ),
    [mode, blinkStyle, isTyping, glowEnabled]
  );

  // Don't render for native mode
  if (mode === 'native') return null;

  return <div className={className} style={style} aria-hidden="true" />;
});
