'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { useSession, signOut } from 'next-auth/react';
import { useMounted } from '@/hooks/use-mobile';
import { Search, Bell, Sun, Moon, Settings, LogOut, User } from 'lucide-react';
import { FriesIcon } from '@/components/icons/fries-icon';
import { Logo } from '@/components/logo';
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

const menuItems = [
  { id: 'profile', icon: User, label: 'View Profile', requiresAuth: true },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function MobileHeaderMenu({ open, onOpenChange }: MobileHeaderMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const mounted = useMounted();
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

  const handleMenuClick = (id: string) => {
    switch (id) {
      case 'profile':
        if (session?.user?.id) handleNavigation(`/profile/${session.user.id}`);
        break;
      case 'search':
        handleSearch();
        break;
      case 'notifications':
      case 'settings':
        handleNavigation('/settings');
        break;
    }
  };

  // Render static button during SSR, Sheet only after mount to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Open menu"
      >
        <FriesIcon size={20} />
      </Button>
    );
  }

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

      <SheetContent side="right" className="w-[300px] sm:w-[350px] flex flex-col">
        {/* Header - Logo like landing page */}
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Logo size={28} />
            <span>Verso</span>
          </SheetTitle>
        </SheetHeader>

        {/* User Profile Card */}
        {user && (
          <div className="mt-6 flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <Avatar className="h-10 w-10" key={user?.image || 'no-avatar-header'}>
              <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
              <AvatarFallback
                className="text-sm text-white font-medium"
                style={session?.user?.id ? getSimpleGradientStyle(session.user.id) : undefined}
              >
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-sm font-semibold truncate">{user?.name || 'User'}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="mt-6 flex flex-col gap-1 flex-1">
          {menuItems.map((item, index) => {
            // Skip auth-required items if not logged in
            if (item.requiresAuth && !session?.user?.id) return null;

            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium',
                  'text-muted-foreground hover:text-foreground hover:bg-accent',
                  'transition-all duration-200 active:scale-[0.98]'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}

          {/* Dark Mode Toggle */}
          <div
            className={cn(
              'flex items-center justify-between px-3 py-3 rounded-lg',
              'text-muted-foreground hover:bg-accent',
              'transition-all duration-200'
            )}
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="text-base font-medium">Dark Mode</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </nav>

        {/* Bottom Section - Log Out */}
        <div className="pt-6 border-t border-border space-y-3">
          <button
            onClick={() => {
              onOpenChange(false);
              signOut({ callbackUrl: '/' });
            }}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-medium',
              'text-destructive hover:bg-destructive/10',
              'transition-all duration-200 active:scale-[0.98]'
            )}
          >
            <LogOut className="h-5 w-5" />
            Log Out
          </button>

          <div className="px-3 text-xs text-muted-foreground">
            Verso v1.0.0
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
