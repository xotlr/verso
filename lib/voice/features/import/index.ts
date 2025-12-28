/**
 * Import Quips Feature
 * Public API for import experience copy
 */

import { randomPick, createSmartPicker } from '../../utils';
import type { SelectionContext } from '../../types';
import { matchTitle } from './matchers';

export { knownTitles, patternQuips, genericQuips, specialCaseQuips } from './pools';

/**
 * Get a playful quip for an imported screenplay title
 */
export function getImportQuip(title: string): string {
  return matchTitle(title, randomPick);
}

/**
 * Get a quip with variety management (avoids recently shown)
 */
export function getImportQuipSmart(title: string, ctx: SelectionContext): string {
  const picker = createSmartPicker(ctx);
  return matchTitle(title, picker);
}

/**
 * Short version for toasts (max 60 chars)
 */
export function getImportQuipShort(title: string): string {
  const quip = getImportQuip(title);
  return quip.length > 60 ? quip.slice(0, 57) + '...' : quip;
}
