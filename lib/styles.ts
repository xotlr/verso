/**
 * Centralized Tailwind class constants for consistent styling across the app.
 * Use these instead of repeating the same class combinations.
 */

// =============================================================================
// Card Styles
// =============================================================================

export const cardStyles = {
  /** Base card with border and rounded corners */
  base: 'bg-card border border-border/60 rounded-lg',

  /** Interactive card hover state */
  hover: 'hover:bg-accent/30 hover:border-border transition-colors duration-150',

  /** Complete interactive card (base + hover) */
  interactive: 'bg-card border border-border/60 rounded-lg hover:bg-accent/30 hover:border-border transition-colors duration-150',

  /** Skeleton loading state for cards */
  skeleton: 'bg-card border border-border/60 rounded-lg animate-pulse',
} as const;

// =============================================================================
// Badge Styles
// =============================================================================

export const badgeStyles = {
  /** Primary colored badge (genre, type labels) */
  primary: 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20',

  /** Secondary/muted badge (metadata, counts) */
  secondary: 'px-2 py-0.5 rounded border border-border/50 bg-muted/50 uppercase tracking-wider font-bold text-[10px]',

  /** Small inline badge */
  inline: 'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-semibold',
} as const;

// =============================================================================
// Text Styles
// =============================================================================

export const textStyles = {
  /** Muted helper/description text - extra small */
  mutedXs: 'text-xs text-muted-foreground',

  /** Muted helper/description text - small */
  mutedSm: 'text-sm text-muted-foreground',

  /** Bold uppercase title (used in list items) */
  boldTitle: 'font-bold uppercase tracking-tight text-sm sm:text-base text-foreground',

  /** Small icon + text combination */
  iconText: 'flex items-center gap-1 text-xs text-muted-foreground',

  /** Extra small icon + text */
  iconTextXs: 'flex items-center gap-1 text-[10px] text-muted-foreground',
} as const;

// =============================================================================
// Layout Styles
// =============================================================================

export const layoutStyles = {
  /** Standard flex row with items centered */
  row: 'flex items-center',

  /** Flex row with gap-1 */
  rowGap1: 'flex items-center gap-1',

  /** Flex row with gap-2 */
  rowGap2: 'flex items-center gap-2',

  /** Flex row with gap-3 */
  rowGap3: 'flex items-center gap-3',

  /** Standard list item row layout */
  listRow: 'flex items-start gap-3 sm:gap-4',

  /** Group flex container with padding (for list items) */
  groupRow: 'group flex items-start gap-3 sm:gap-4 p-3 sm:p-4',
} as const;

// =============================================================================
// Skeleton Styles
// =============================================================================

export const skeletonStyles = {
  /** Base skeleton element */
  base: 'bg-muted rounded animate-pulse',

  /** Text line skeleton - full width */
  textFull: 'h-4 w-full bg-muted rounded',

  /** Text line skeleton - 3/4 width */
  text3_4: 'h-5 w-3/4 bg-muted rounded',

  /** Text line skeleton - 1/2 width */
  textHalf: 'h-4 w-1/2 bg-muted rounded',
} as const;

// =============================================================================
// Helper to combine classes
// =============================================================================

/**
 * Combines multiple style constants with optional additional classes.
 * @example
 * combineStyles(cardStyles.base, cardStyles.hover, 'p-4')
 */
export function combineStyles(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
