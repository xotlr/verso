// Accessibility utilities and helpers

export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTab);

  return () => element.removeEventListener('keydown', handleTab);
};

export const getAriaLabel = (action: string, shortcut?: string): string => {
  return shortcut ? `${action} (${shortcut})` : action;
};

export const formatShortcut = (shortcut: string): string => {
  return shortcut
    .replace('Mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    .replace('Shift', '⇧')
    .replace('Alt', navigator.platform.includes('Mac') ? '⌥' : 'Alt');
};

export const checkColorContrast = (foreground: string, background: string): number => {
  // Simplified WCAG contrast ratio calculation
  const getLuminance = (color: string) => {
    // This is a simplified version - in production, use a proper color library
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

export const keyboardNavigationHelper = {
  isNavigationKey: (key: string) => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key);
  },

  isActionKey: (key: string) => {
    return ['Enter', ' ', 'Space'].includes(key);
  },

  isCancelKey: (key: string) => {
    return ['Escape', 'Esc'].includes(key);
  },
};

export const focusManagement = {
  saveFocus: () => {
    return document.activeElement as HTMLElement;
  },

  restoreFocus: (element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  },

  moveFocusToFirst: (container: HTMLElement) => {
    const firstFocusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  },
};
