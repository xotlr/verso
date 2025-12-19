/**
 * Shared toolbar styles for consistent look across all editor toolbars.
 * Use these constants to ensure visual consistency and enable easy theme changes.
 */

export const toolbarStyles = {
  // Container styles
  container: {
    base: 'bg-background border border-border/50 shadow-lg shadow-black/10',
    rounded: 'rounded-md',
    padding: {
      horizontal: 'px-2 gap-0.5',
      vertical: 'py-2 gap-1',
    },
  },

  // Button styles
  button: {
    base: 'relative flex items-center justify-center transition-all duration-150',
    size: 'w-9 h-9',
    rounded: 'rounded-md',
    states: {
      active: 'bg-primary/10 text-primary',
      inactive: 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      disabled: 'opacity-40 pointer-events-none',
    },
  },

  // Divider styles
  divider: {
    base: 'bg-border/50',
    horizontal: 'w-px h-6 mx-1',
    vertical: 'h-px w-6 my-1',
  },

  // Badge styles (for counts)
  badge: {
    base: 'absolute -top-0.5 -right-0.5 flex items-center justify-center',
    size: 'h-4 min-w-4 px-1',
    style: 'rounded-full bg-primary text-primary-foreground text-[9px] font-medium',
  },
} as const;

// Helper to combine toolbar button classes
export function getToolbarButtonClasses(isActive: boolean, disabled: boolean, className?: string) {
  const { button } = toolbarStyles;
  return [
    button.base,
    button.size,
    button.rounded,
    disabled ? button.states.disabled : '',
    isActive ? button.states.active : button.states.inactive,
    className,
  ].filter(Boolean).join(' ');
}

// Helper to combine toolbar container classes
export function getToolbarContainerClasses(orientation: 'horizontal' | 'vertical', className?: string) {
  const { container } = toolbarStyles;
  return [
    'flex items-center',
    container.base,
    container.rounded,
    orientation === 'horizontal' ? container.padding.horizontal : `flex-col ${container.padding.vertical}`,
    className,
  ].filter(Boolean).join(' ');
}
