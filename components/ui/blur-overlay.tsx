'use client';

import { cn } from '@/lib/utils';

export interface BlurOverlayProps {
  /** Blur radius in pixels (default: 40) */
  blur?: number;
  /** Opacity 0-1 (default: 0.6) */
  opacity?: number;
  /** Optional color tint, e.g., "rgba(0,0,0,0.1)" */
  tint?: string;
  /** Add subtle noise texture for premium glass effect */
  noise?: boolean;
  /** Gradient mask at edges for soft falloff */
  fadeEdges?: boolean;
  /** Additional className */
  className?: string;
}

// Inline SVG noise texture as data URI for performance
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

export function BlurOverlay({
  blur = 40,
  opacity = 0.6,
  tint,
  noise = false,
  fadeEdges = false,
  className,
}: BlurOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        'will-change-transform transform-gpu',
        className
      )}
      style={{
        // CSS custom properties for easy theming
        '--blur-radius': `${blur}px`,
        '--blur-opacity': opacity,
        '--blur-tint': tint || 'transparent',
      } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* Main blur layer */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          backgroundColor: tint || 'transparent',
          opacity,
          // Gradient mask for soft edges
          ...(fadeEdges && {
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
          }),
        }}
      />

      {/* Optional noise texture overlay */}
      {noise && (
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: NOISE_SVG,
            backgroundRepeat: 'repeat',
          }}
        />
      )}
    </div>
  );
}
