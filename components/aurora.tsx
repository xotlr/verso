'use client';

import { useEffect, useState } from 'react';
import { MeshGradient } from '@mesh-gradient/react';

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

  // Blend primary toward background for subtlety
  const blendedPrimaryL = (primary.l * 0.4 + background.l * 0.6);
  const blendedPrimaryS = (primary.s * 0.5 + background.s * 0.5);

  return [
    hslToHex(background.h, background.s, background.l), // background base
    hslToHex(background.h, background.s, Math.min(100, background.l * 1.1)), // slightly lighter bg
    hslToHex(background.h, background.s, Math.min(100, background.l * 1.2)), // lighter bg
    hslToHex(primary.h, blendedPrimaryS, blendedPrimaryL), // subtle primary accent
  ];
}

interface AuroraProps {
  colors?: [string, string, string, string];
  speed?: number;
  className?: string;
}

export function Aurora({ colors, speed = 1.0, className = '' }: AuroraProps) {
  const [themeColors, setThemeColors] = useState<[string, string, string, string]>(
    colors || ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#2a2a2a']
  );

  useEffect(() => {
    if (!colors) {
      setThemeColors(getPrimaryPalette());
    }
  }, [colors]);

  useEffect(() => {
    if (colors) return;
    const observer = new MutationObserver(() => setThemeColors(getPrimaryPalette()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [colors]);

  return (
    <MeshGradient
      className={`w-full h-full ${className}`}
      options={{
        colors: themeColors,
        animationSpeed: speed,
        frequency: 0.00008, // lower = fewer/larger waves
      }}
    />
  );
}
