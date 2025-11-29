'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { CircleUser, Search, Bell, Sun, Moon, Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function MenuItem({ icon: Icon, label, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 w-full px-4 py-3.5',
        'rounded-lg transition-all duration-200',
        'hover:bg-accent active:scale-[0.98]',
        'text-foreground/80 hover:text-foreground',
        'min-h-[48px]'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-[15px] font-medium">{label}</span>
    </button>
  );
}

export function MobileHeaderMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleNavigation = (path: string) => {
    setOpen(false);
    setTimeout(() => router.push(path), 150);
  };

  const handleSearch = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('command-palette-open'));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label="Open menu"
        >
          <CircleUser className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[280px] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-left text-lg">Quick Actions</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 py-4 space-y-1">
          {/* Search */}
          <MenuItem icon={Search} label="Search" onClick={handleSearch} />

          {/* Notifications */}
          <MenuItem
            icon={Bell}
            label="Notifications"
            onClick={() => handleNavigation('/settings')}
          />

          <div className="h-px bg-border my-3" />

          {/* Theme Toggle - Inline with Switch */}
          <div className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center gap-4">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 shrink-0" />
              ) : (
                <Sun className="h-5 w-5 shrink-0" />
              )}
              <span className="text-[15px] font-medium">Dark Mode</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {/* Settings */}
          <MenuItem
            icon={Settings}
            label="Settings"
            onClick={() => handleNavigation('/settings')}
          />
        </nav>

        <div className="border-t pt-4 pb-2">
          <div className="px-4 text-xs text-muted-foreground">Verso v1.0.0</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
