'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { useSession, signOut } from 'next-auth/react';
import { Search, Bell, Sun, Moon, Settings, LogOut, User } from 'lucide-react';
import { FriesIcon } from '@/components/icons/fries-icon';
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

interface MobileHeaderMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function MobileHeaderMenu({ open, onOpenChange }: MobileHeaderMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const user = session?.user;

  const handleNavigation = (path: string) => {
    onOpenChange(false);
    setTimeout(() => router.push(path), 150);
  };

  const handleSearch = () => {
    onOpenChange(false);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('command-palette-open'));
    }, 150);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Open menu"
        >
          <div className={cn(
            "transition-transform duration-300 ease-out",
            open && "scale-x-[-1]"
          )}>
            <FriesIcon size={20} />
          </div>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-full sm:max-w-full flex flex-col [&>button:last-of-type]:hidden pt-4 border-l-0"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-sm bg-muted">
              <Avatar className="h-10 w-10 rounded-sm" key={user?.image || 'no-avatar-header'}>
                <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} className="rounded-sm" />
                <AvatarFallback
                  className="text-sm text-white font-medium rounded-sm"
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
        </SheetHeader>

        <nav className="flex-1 py-4 space-y-1">
          {/* Profile */}
          {session?.user?.id && (
            <div
              className="animate-in fade-in slide-in-from-right-4 fill-mode-both"
              style={{ animationDelay: '0ms', animationDuration: '300ms' }}
            >
              <MenuItem
                icon={User}
                label="View Profile"
                onClick={() => handleNavigation(`/profile/${session.user.id}`)}
              />
            </div>
          )}

          {/* Search */}
          <div
            className="animate-in fade-in slide-in-from-right-4 fill-mode-both"
            style={{ animationDelay: '50ms', animationDuration: '300ms' }}
          >
            <MenuItem icon={Search} label="Search" onClick={handleSearch} />
          </div>

          {/* Notifications */}
          <div
            className="animate-in fade-in slide-in-from-right-4 fill-mode-both"
            style={{ animationDelay: '100ms', animationDuration: '300ms' }}
          >
            <MenuItem
              icon={Bell}
              label="Notifications"
              onClick={() => handleNavigation('/settings')}
            />
          </div>

          {/* Theme Toggle - Inline with Switch */}
          <div
            className="animate-in fade-in slide-in-from-right-4 fill-mode-both"
            style={{ animationDelay: '150ms', animationDuration: '300ms' }}
          >
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
          </div>

          {/* Settings */}
          <div
            className="animate-in fade-in slide-in-from-right-4 fill-mode-both"
            style={{ animationDelay: '200ms', animationDuration: '300ms' }}
          >
            <MenuItem
              icon={Settings}
              label="Settings"
              onClick={() => handleNavigation('/settings')}
            />
          </div>

          {/* Log Out */}
          <div
            className="animate-in fade-in slide-in-from-right-4 fill-mode-both"
            style={{ animationDelay: '250ms', animationDuration: '300ms' }}
          >
            <button
              onClick={() => {
                onOpenChange(false);
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
          </div>
        </nav>

        <div className="pt-4 pb-2">
          <div className="px-4 text-xs text-muted-foreground">Verso v1.0.0</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
