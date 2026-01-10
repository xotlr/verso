'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMounted } from '@/hooks/use-mobile';
import {
  PenTool,
  Search,
  Plus,
  FolderPlus,
  FileText,
  Settings,
} from 'lucide-react';
import { TbHome, TbHomeFilled } from 'react-icons/tb';
import { PiFilmScript, PiFilmScriptFill } from 'react-icons/pi';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

// Note: We use Drawer (vaul) for bottom sheets with swipe-to-dismiss support

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();

  // Get last screenplay ID from localStorage (lazy initializer avoids effect)
  const [lastScreenplayId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lastScreenplayId');
  });

  const [createOpen, setCreateOpen] = useState(false);

  // Extract screenplay ID from current path if on a screenplay route
  const currentScreenplayId = (() => {
    const screenplayRoutes = ['/screenplay/', '/board/', '/graph/', '/cards/', '/visualization/'];
    for (const route of screenplayRoutes) {
      if (pathname.startsWith(route)) {
        return pathname.slice(route.length).split('/')[0];
      }
    }
    return null;
  })();

  // Use current screenplay or last opened (only after mount to prevent hydration mismatch)
  const screenplayId = currentScreenplayId || (mounted ? lastScreenplayId : null);

  const handleCreateAction = (action: 'screenplay' | 'project' | 'continue') => {
    setCreateOpen(false);
    setTimeout(() => {
      if (action === 'screenplay') {
        // Open template selector via event
        window.dispatchEvent(new CustomEvent('open-template-selector'));
      } else if (action === 'project') {
        // Open new project dialog via event
        window.dispatchEvent(new CustomEvent('open-new-project'));
      } else if (action === 'continue' && screenplayId) {
        router.push(`/screenplay/${screenplayId}`);
      }
    }, 150);
  };

  // Check if route is active
  const isActive = (path: string) => {
    if (path === '/home') return pathname === '/home';
    if (path === '/screenplays') return pathname === '/screenplays' || pathname === '/projects';
    if (path === '/settings') return pathname === '/settings';
    return false;
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('command-palette-open'));
  };

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-evenly h-14 bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/30">
        {/* Home */}
        <Link
          href="/home"
          className={cn(
            "group flex items-center justify-center p-3 rounded-xl min-w-[48px] touch-manipulation relative tap-bounce",
            "transition-colors duration-200",
            isActive('/home')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {isActive('/home') ? (
            <TbHomeFilled className="h-6 w-6 transition-all duration-300 scale-105 group-active:scale-90" />
          ) : (
            <TbHome className="h-6 w-6 transition-all duration-300 group-active:scale-90" />
          )}
          {isActive('/home') && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
          )}
        </Link>

        {/* Scripts */}
        <Link
          href="/screenplays"
          className={cn(
            "group flex items-center justify-center p-3 rounded-xl min-w-[48px] touch-manipulation relative tap-bounce",
            "transition-colors duration-200",
            isActive('/screenplays')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {isActive('/screenplays') ? (
            <PiFilmScriptFill className="h-6 w-6 transition-all duration-300 scale-105 group-active:scale-90" />
          ) : (
            <PiFilmScript className="h-6 w-6 transition-all duration-300 group-active:scale-90" />
          )}
          {isActive('/screenplays') && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
          )}
        </Link>

        {/* Create - Central action button with quick actions drawer */}
        {/* Render static button during SSR, Drawer only after mount to avoid hydration mismatch */}
        {mounted ? (
          <Drawer open={createOpen} onOpenChange={setCreateOpen}>
            <DrawerTrigger asChild>
              <button
                className={cn(
                  "group flex items-center justify-center p-3 rounded-xl min-w-[48px] touch-manipulation relative tap-bounce",
                  "transition-colors duration-200",
                  createOpen
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus className={cn(
                  "h-6 w-6 transition-all duration-300",
                  createOpen
                    ? "fill-primary stroke-primary scale-105 rotate-45"
                    : "fill-none stroke-current",
                  "group-active:scale-90"
                )} />
                {createOpen && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </DrawerTrigger>
            <DrawerContent className="pb-safe">
              <DrawerHeader className="pb-3 px-5">
                <DrawerTitle className="text-base font-semibold text-left">Create New</DrawerTitle>
              </DrawerHeader>

              {/* 2-column grid */}
              <div className="grid grid-cols-2 gap-3 px-4 pb-6">
                {/* New Screenplay */}
                <button
                  onClick={() => handleCreateAction('screenplay')}
                  className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent active:scale-95 transition-all duration-200 touch-manipulation min-h-[108px]"
                >
                  <div className="p-2.5 rounded-md bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <span className="font-medium text-sm">New Screenplay</span>
                </button>

                {/* New Project */}
                <button
                  onClick={() => handleCreateAction('project')}
                  className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent active:scale-95 transition-all duration-200 touch-manipulation min-h-[108px]"
                >
                  <div className="p-2.5 rounded-md bg-muted">
                    <FolderPlus className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <span className="font-medium text-sm">New Project</span>
                </button>

                {/* Continue Writing - full width */}
                {screenplayId && (
                  <button
                    onClick={() => handleCreateAction('continue')}
                    className="group col-span-2 flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent active:scale-[0.98] transition-all duration-200 touch-manipulation"
                  >
                    <div className="p-2 rounded-md bg-muted flex-shrink-0">
                      <PenTool className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                    </div>
                    <span className="font-medium text-sm">Continue Writing</span>
                  </button>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <button
            className="group flex items-center justify-center p-3 rounded-xl min-w-[48px] touch-manipulation relative text-muted-foreground"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {/* Search */}
        <button
          onClick={openSearch}
          className={cn(
            "group flex items-center justify-center p-3 rounded-xl min-w-[48px] touch-manipulation relative tap-bounce",
            "transition-colors duration-200",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          <Search className="h-6 w-6 transition-all duration-300 group-active:scale-90" />
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "group flex items-center justify-center p-3 rounded-xl min-w-[48px] touch-manipulation relative tap-bounce",
            "transition-colors duration-200",
            isActive('/settings')
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className={cn(
            "h-6 w-6 transition-all duration-300",
            isActive('/settings') && "scale-105",
            "group-active:scale-90"
          )} />
          {isActive('/settings') && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
          )}
        </Link>
      </div>
    </nav>
  );
}
