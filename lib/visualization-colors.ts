'use client';

import { useSettings } from '@/contexts/settings-context';
import { useTheme } from 'next-themes';
import { ActColorScheme } from '@/types/settings';

export interface ResolvedVisualizationColors {
  beatColors: string[];
  actColors: {
    act1: ActColorScheme;
    act2a: ActColorScheme;
    act2b: ActColorScheme;
    act3: ActColorScheme;
  };
  sceneColors: string[];
  characterColors: string[];
  locationColors: string[];
}

export function useVisualizationColors(): ResolvedVisualizationColors {
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  return isDark
    ? settings.visual.darkVisualization
    : settings.visual.lightVisualization;
}

/**
 * Get the color for an item, preferring the item's custom color over the palette
 */
export function getItemColor(
  itemColor: string | null | undefined,
  palette: string[],
  index: number
): string {
  return itemColor || palette[index % palette.length];
}

/**
 * Get beat color from palette by index
 */
export function getBeatColor(palette: ResolvedVisualizationColors, index: number): string {
  return palette.beatColors[index % palette.beatColors.length];
}

/**
 * Get scene color from palette by index
 */
export function getSceneColor(palette: ResolvedVisualizationColors, index: number): string {
  return palette.sceneColors[index % palette.sceneColors.length];
}

/**
 * Get character color from palette by index
 */
export function getCharacterColor(palette: ResolvedVisualizationColors, index: number): string {
  return palette.characterColors[index % palette.characterColors.length];
}

/**
 * Get location color from palette by index
 */
export function getLocationColor(palette: ResolvedVisualizationColors, index: number): string {
  return palette.locationColors[index % palette.locationColors.length];
}

/**
 * Get act color scheme by act ID
 */
export function getActColors(
  palette: ResolvedVisualizationColors,
  actId: 'act1' | 'act2a' | 'act2b' | 'act3'
): ActColorScheme {
  return palette.actColors[actId];
}
