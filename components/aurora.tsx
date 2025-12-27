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
  const blendedPrimaryL = (primary.l * 0.03 + background.l * 0.97);
  const blendedPrimaryS = (primary.s * 0.05 + background.s * 0.95);

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
        animationSpeed: speed * 0.6,
        frequency: {
          x: 0.00012,
          y: 0.00018,
          delta: 0.00006,
        },
      }}
    />
  );
}
