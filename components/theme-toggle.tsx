'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { flushSync } from 'react-dom';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = React.useCallback(async (
    newTheme: 'light' | 'dark' | 'system',
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Get click position for animation origin
    const button = event.currentTarget;
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;

    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    // Start view transition
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    });

    await transition.ready;

    // Calculate max radius for the circle to cover the whole screen
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Animate the new view with expanding circle
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  }, [setTheme]);

  if (!mounted) {
    return (
      <div className="flex items-center bg-muted rounded-md p-0.5 border border-border/60 h-7 w-[84px]" />
    );
  }

  const options = [
    { value: 'light', icon: Sun, label: 'Light mode' },
    { value: 'dark', icon: Moon, label: 'Dark mode' },
    { value: 'system', icon: Monitor, label: 'System theme' },
  ] as const;

  return (
    <div
      ref={containerRef}
      className="flex items-center bg-muted rounded-md p-0.5 border border-border/60"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={(e) => handleThemeChange(value, e)}
          role="radio"
          aria-checked={theme === value}
          className={cn(
            "p-1 rounded transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            theme === value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
          title={label}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
