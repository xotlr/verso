'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useGlassStyles } from '@/hooks/use-glass-styles';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { isGlass, container } = useGlassStyles();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn(
        "flex flex-col rounded-xl p-1 h-[94px] w-8",
        container
      )} />
    );
  }

  const options = [
    { value: 'light', icon: Sun, label: 'Light mode' },
    { value: 'dark', icon: Moon, label: 'Dark mode' },
    { value: 'system', icon: Monitor, label: 'System theme' },
  ] as const;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl p-1 gap-0.5",
        container
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          role="radio"
          aria-checked={theme === value}
          className={cn(
            "p-1.5 rounded-lg",
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
