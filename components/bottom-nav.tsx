'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Home,
  FileText,
  PenTool,
  BarChart3,
  Rows3,
  LayoutGrid,
  TrendingUp,
  Plus,
  FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [lastScreenplayId, setLastScreenplayId] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Get last screenplay ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastScreenplayId');
    if (stored) {
      setLastScreenplayId(stored);
    }
  }, []);

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

  // Use current screenplay or last opened
  const screenplayId = currentScreenplayId || lastScreenplayId;

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

  const handleToolClick = (path: string) => {
    setToolsOpen(false);
    router.push(path);
  };

  // Check if route is active
  const isActive = (path: string) => {
    if (path === '/home') return pathname === '/home';
    if (path === '/screenplays') return pathname === '/screenplays' || pathname === '/projects';
    if (path === '/settings') return pathname === '/settings';
    return false;
  };

  const isToolsActive = pathname.startsWith('/board/') ||
                        pathname.startsWith('/cards/') ||
                        pathname.startsWith('/visualization/') ||
                        pathname.startsWith('/graph/');

  // Calculate active tab index for sliding indicator
  const getActiveIndex = () => {
    if (isActive('/home')) return 0;
    if (isActive('/screenplays')) return 1;
    if (createOpen) return 2;
    if (isToolsActive || toolsOpen) return 3;
    if (isActive('/settings')) return 4;
    return -1; // No indicator
  };

  const activeIndex = getActiveIndex();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="relative flex items-center justify-around h-16 px-2">
        {/* Sliding active indicator */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-1 h-0.5 w-8 bg-primary rounded-full transition-all duration-300 ease-out"
            style={{
              left: `calc(${activeIndex} * 20% + 10% - 16px)`,
            }}
          />
        )}
        {/* Home */}
        <Link
          href="/home"
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg min-w-[56px] touch-manipulation relative tap-bounce",
            "transition-colors duration-200",
            isActive('/home')
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className={cn(
            "h-5 w-5 transition-all duration-200",
            isActive('/home') && "scale-110",
            "group-active:scale-90 group-active:rotate-[-8deg]"
          )} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Files */}
        <Link
          href="/screenplays"
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg min-w-[56px] touch-manipulation relative tap-bounce",
            "transition-colors duration-200",
            isActive('/screenplays')
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className={cn(
            "h-5 w-5 transition-all duration-200",
            isActive('/screenplays') && "scale-110",
            "group-active:scale-90 group-active:rotate-[-8deg]"
          )} />
          <span className="text-[10px] font-medium">Files</span>
        </Link>

        {/* Create - Central action button with quick actions sheet */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "group flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg min-w-[56px] touch-manipulation relative tap-bounce",
                "transition-colors duration-200",
                createOpen
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className={cn(
                "h-5 w-5 transition-all duration-200",
                createOpen && "scale-110 rotate-45",
                "group-active:scale-90 group-active:rotate-90"
              )} />
              <span className="text-[10px] font-medium">Create</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl border-t-0 pb-safe">
            {/* Drag handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full mx-auto mb-4 mt-2" />

            <SheetHeader className="pb-3 px-1">
              <SheetTitle className="text-base font-semibold text-left">Create New</SheetTitle>
            </SheetHeader>

            {/* 2-column grid */}
            <div className="grid grid-cols-2 gap-3 pb-6">
              {/* New Screenplay */}
              <button
                onClick={() => handleCreateAction('screenplay')}
                className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-border/50 bg-gradient-to-b from-card to-card/50 hover:border-primary/30 hover:bg-accent active:scale-95 transition-all duration-200 touch-manipulation min-h-[108px] shadow-sm hover:shadow"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-3 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                    <FileText className="h-6 w-6 text-primary" strokeWidth={2} />
                  </div>
                </div>
                <span className="font-medium text-sm">New Screenplay</span>
              </button>

              {/* New Project */}
              <button
                onClick={() => handleCreateAction('project')}
                className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-border/50 bg-gradient-to-b from-card to-card/50 hover:border-orange-500/30 hover:bg-accent active:scale-95 transition-all duration-200 touch-manipulation min-h-[108px] shadow-sm hover:shadow"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-3 rounded-full bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent">
                    <FolderPlus className="h-6 w-6 text-orange-500" strokeWidth={2} />
                  </div>
                </div>
                <span className="font-medium text-sm">New Project</span>
              </button>

              {/* Continue Writing - full width */}
              {screenplayId && (
                <button
                  onClick={() => handleCreateAction('continue')}
                  className="group col-span-2 flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-gradient-to-r from-card to-card/50 hover:border-blue-500/30 hover:bg-accent active:scale-[0.98] transition-all duration-200 touch-manipulation shadow-sm hover:shadow"
                >
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative p-2.5 rounded-full bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
                      <PenTool className="h-5 w-5 text-blue-500" strokeWidth={2} />
                    </div>
                  </div>
                  <span className="font-medium text-sm">Continue Writing</span>
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Tools */}
        <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "group flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg min-w-[56px] touch-manipulation relative tap-bounce",
                "transition-colors duration-200",
                isToolsActive || toolsOpen
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className={cn(
                "h-5 w-5 transition-all duration-200",
                (isToolsActive || toolsOpen) && "scale-110",
                "group-active:scale-90 group-active:rotate-[-8deg]"
              )} />
              <span className="text-[10px] font-medium">Tools</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl border-t-0 pb-safe">
            {/* Drag handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full mx-auto mb-4 mt-2" />
            <SheetHeader className="pb-4 px-1">
              <SheetTitle className="text-left">Screenplay Tools</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 pb-6">
              <button
                onClick={() => screenplayId && handleToolClick(`/board/${screenplayId}`)}
                disabled={!screenplayId}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-colors",
                  screenplayId
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Rows3 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Beat Board</p>
                  <p className="text-xs text-muted-foreground">Story structure</p>
                </div>
              </button>

              <button
                onClick={() => screenplayId && handleToolClick(`/cards/${screenplayId}`)}
                disabled={!screenplayId}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-colors",
                  screenplayId
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <LayoutGrid className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Index Cards</p>
                  <p className="text-xs text-muted-foreground">Scene overview</p>
                </div>
              </button>

              <button
                onClick={() => screenplayId && handleToolClick(`/graph/${screenplayId}`)}
                disabled={!screenplayId}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-colors",
                  screenplayId
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Story Graph</p>
                  <p className="text-xs text-muted-foreground">Visual analysis</p>
                </div>
              </button>

              <button
                onClick={() => screenplayId && handleToolClick(`/visualization/${screenplayId}`)}
                disabled={!screenplayId}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-colors",
                  screenplayId
                    ? "hover:bg-accent cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Reports</p>
                  <p className="text-xs text-muted-foreground">Stats & insights</p>
                </div>
              </button>
            </div>
            {!screenplayId && (
              <p className="text-center text-sm text-muted-foreground pb-4">
                Open a screenplay to use these tools
              </p>
            )}
          </SheetContent>
        </Sheet>

        {/* Profile */}
        <Link
          href="/settings"
          className={cn(
            "group flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg min-w-[56px] touch-manipulation relative tap-bounce",
            "transition-colors duration-200",
            isActive('/settings')
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "transition-all duration-200",
            isActive('/settings') && "scale-110",
            "group-active:scale-90"
          )}>
            <ProfileAvatar
              userId={session?.user?.id || ''}
              imageUrl={session?.user?.image}
              name={session?.user?.name}
              size="xs"
            />
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
