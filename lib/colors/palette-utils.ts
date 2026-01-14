/**
 * Color palette utilities for petal effects and other color-based visualizations.
 */

import * as THREE from 'three';

export type PetalPalette = 'primary' | 'sakura' | 'rose' | 'autumn' | 'snow' | 'blossom' | 'gold' | 'blood';

/**
 * Pre-defined color palettes for petals.
 */
export const PALETTE_COLORS: Record<Exclude<PetalPalette, 'primary'>, string[]> = {
  sakura: [
    '#f8ecf2', '#f0dce6', '#e8ccd8', '#e0bccc', '#d8acc0',
    '#ffffff', '#fff5f8', '#fce4ec',
  ],
  rose: [
    '#E8B4B8', '#D4A0A4', '#C98B8F', '#F2C4C8', '#DEB0B4',
    '#F0D0D4', '#E0A8AC', '#D09498',
  ],
  autumn: [
    '#E8C4A0', '#D4A882', '#C99066', '#F2D8C0', '#DEBCA0',
    '#F5E0C8', '#D8B090', '#C8A078',
  ],
  snow: [
    '#E8E8F0', '#D4D4E0', '#C0C0D0', '#F2F2FA', '#DEDEE8',
    '#F8F8FF', '#E0E0F0', '#D8D8E8',
  ],
  blossom: [
    '#F4B8C8', '#E8A0B4', '#DC88A0', '#FFD0DC', '#F0C0CC',
    '#FFE0E8', '#E890A8', '#D47890',
  ],
  gold: [
    '#FFD700', '#FFC800', '#FFDF00', '#FFE44D', '#FFCC00',
    '#FFE066', '#FFDB4D', '#FFC933',
  ],
  blood: [
    '#8B0000', '#A52A2A', '#B22222', '#CD5C5C', '#DC143C',
    '#990000', '#AA3333', '#C04040',
  ],
};

/**
 * Convert HSL values to hex color string.
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 */
export function hslToHex(h: number, s: number, l: number): string {
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

/**
 * Generate a palette of colors based on a primary HSL color.
 * Creates variations with randomized hue, saturation, and lightness.
 *
 * @param primaryColor - HSL color string in format "h s l" (e.g., "350 80 60")
 * @returns Array of hex color strings
 */
export function generatePrimaryPalette(primaryColor: string): string[] {
  const parts = primaryColor.split(' ');
  if (parts.length < 3) return PALETTE_COLORS.sakura;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);

  const colors: string[] = [];
  for (let i = 0; i < 8; i++) {
    const lVar = l + (Math.random() - 0.5) * 30;
    const sVar = s + (Math.random() - 0.5) * 20;
    const hVar = h + (Math.random() - 0.5) * 15;
    colors.push(hslToHex(
      (hVar + 360) % 360,
      Math.max(10, Math.min(100, sVar)),
      Math.max(20, Math.min(90, lVar))
    ));
  }

  return colors;
}

/**
 * Get THREE.js Color array for a palette.
 *
 * @param palette - Palette name
 * @param primaryColor - Optional HSL string for 'primary' palette
 */
export function getColors(palette: PetalPalette, primaryColor?: string): THREE.Color[] {
  let hexColors: string[];

  if (palette === 'primary' && primaryColor) {
    hexColors = generatePrimaryPalette(primaryColor);
  } else if (palette !== 'primary' && palette in PALETTE_COLORS) {
    hexColors = PALETTE_COLORS[palette];
  } else {
    hexColors = PALETTE_COLORS.sakura;
  }

  return hexColors.map(hex => new THREE.Color(hex));
}
