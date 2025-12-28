'use client';

import { useEffect, useRef } from 'react';
import { Gradient } from '@/lib/gradient';

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function parseHsl(hslStr: string): { h: number; s: number; l: number } | null {
  const match = hslStr.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!match) return null;
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function getPrimaryPalette(): [string, string, string, string] {
  if (typeof window === 'undefined') {
    return ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#2a2a2a'];
  }

  const style = getComputedStyle(document.documentElement);
  const primary = parseHsl(style.getPropertyValue('--primary').trim());
  const background = parseHsl(style.getPropertyValue('--background').trim());

  if (!primary || !background) {
    return ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#2a2a2a'];
  }

  // Detect light mode and adjust visibility accordingly
  const isLightMode = background.l > 50;
  const primaryInfluence = isLightMode ? 0.15 : 0.05;

  // More visible in light mode, subtle in dark mode
  const blendedPrimaryL = primary.l * primaryInfluence + background.l * (1 - primaryInfluence);
  const blendedPrimaryS = primary.s * (primaryInfluence * 2) + background.s * (1 - primaryInfluence * 2);

  return [
    hslToHex(background.h, background.s, background.l * 0.9), // darker bg
    hslToHex(background.h, background.s, background.l), // background base
    hslToHex(background.h, background.s, Math.min(100, background.l * 1.25)), // lighter bg
    hslToHex(primary.h, blendedPrimaryS, blendedPrimaryL), // subtle primary accent
  ];
}

interface AuroraProps {
  colors?: [string, string, string, string];
  speed?: number;
  className?: string;
}

export function Aurora({ colors, className = '' }: AuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<Gradient | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const themeColors = colors || getPrimaryPalette();
    const gradient = new Gradient();
    gradientRef.current = gradient;
    gradient.connect(canvasRef.current, themeColors);

    return () => {
      gradient.disconnect();
      gradientRef.current = null;
    };
  }, [colors]);

  // Watch for theme changes
  useEffect(() => {
    if (colors) return; // Skip if custom colors provided

    const observer = new MutationObserver(() => {
      // Wait for CSS variables to update after class change
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (gradientRef.current && canvasRef.current) {
            gradientRef.current.disconnect();
            const newGradient = new Gradient();
            gradientRef.current = newGradient;
            newGradient.connect(canvasRef.current, getPrimaryPalette());
          }
        }, 50);
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [colors]);

  return (
    <div className={`w-full h-full relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: 'block' }}
      />
    </div>
  );
}
