'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { Search, Bell, Sun, Moon, Settings, LogOut, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
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
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const user = session?.user;

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
          className="relative h-8 w-8 p-0"
          aria-label="Open menu"
        >
          <Avatar className="h-7 w-7" key={user?.image || 'no-avatar'}>
            <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
            <AvatarFallback
              className="text-xs text-white font-medium"
              style={session?.user?.id ? getSimpleGradientStyle(session.user.id) : undefined}
            >
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[280px] flex flex-col">
        <SheetHeader className="border-b pb-4">
          {user && (
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-10 w-10" key={user?.image || 'no-avatar-header'}>
                <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
                <AvatarFallback
                  className="text-sm text-white font-medium"
                  style={session?.user?.id ? getSimpleGradientStyle(session.user.id) : undefined}
                >
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold truncate">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
          )}
          <SheetTitle className="text-left text-lg sr-only">Menu</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 py-4 space-y-1">
          {/* Profile */}
          {session?.user?.id && (
            <MenuItem
              icon={User}
              label="View Profile"
              onClick={() => handleNavigation(`/profile/${session.user.id}`)}
            />
          )}

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

          <div className="h-px bg-border my-3" />

          {/* Log Out */}
          <button
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            className={cn(
              'flex items-center gap-4 w-full px-4 py-3.5',
              'rounded-lg transition-all duration-200',
              'hover:bg-destructive/10 active:scale-[0.98]',
              'text-destructive',
              'min-h-[48px]'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-[15px] font-medium">Log Out</span>
          </button>
        </nav>

        <div className="border-t pt-4 pb-2">
          <div className="px-4 text-xs text-muted-foreground">Verso v1.0.0</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
