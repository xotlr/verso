"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileHeaderMenu } from "@/components/mobile-header-menu";
import { EditableTitle } from "@/components/editable-title";
import { Search, Bell, Settings, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

// Get active item label from pathname
function getActiveItem(pathname: string, dynamicTitle: string | null): {
  label: string;
  isTitle: boolean;
} {
  const segments = pathname.split("/").filter(s => s && s !== "home");

  const labelMap: Record<string, string> = {
    screenplays: "Screenplays",
    projects: "Projects",
    series: "Series",
    explore: "Explore",
    editor: "Editor",
    board: "Beat Board",
    cards: "Index Cards",
    visualization: "Reports",
    graph: "Story Graph",
    settings: "Settings",
    profile: "Profile",
    team: "Team",
    project: "Project",
    shotlist: "Shotlist",
    read: "Read",
    screenplay: "Screenplay",
  };

  // If we're at /home or root, show "Home"
  if (segments.length === 0) {
    return { label: "Home", isTitle: false };
  }

  // Get the last segment (current page)
  const lastSegment = segments[segments.length - 1];

  // Check if this segment looks like an entity ID (CUID or UUID) and we have a dynamic title
  const isEntityId = lastSegment.match(/^[a-z0-9]{20,}$/i) || lastSegment.match(/^[a-f0-9-]{36}$/);

  if (isEntityId && dynamicTitle) {
    return { label: dynamicTitle, isTitle: true };
  }

  const label = labelMap[lastSegment] || (isEntityId ? "Loading..." : lastSegment);
  return { label, isTitle: false };
}

// Get page title for mobile header
function getPageTitle(pathname: string): string {
  const titleMap: Record<string, string> = {
    "/home": "Verso",
    "/screenplays": "Screenplays",
    "/projects": "Projects",
    "/explore": "Explore",
    "/settings": "Settings",
  };

  // Check exact matches first
  if (titleMap[pathname]) return titleMap[pathname];

  // Check route patterns
  if (pathname.startsWith("/screenplay/")) return "Editor";
  if (pathname.startsWith("/shotlist/")) return "Shotlist";
  if (pathname.startsWith("/board/")) return "Beat Board";
  if (pathname.startsWith("/cards/")) return "Index Cards";
  if (pathname.startsWith("/visualization/")) return "Reports";
  if (pathname.startsWith("/graph/")) return "Story Graph";
  if (pathname.startsWith("/read/")) return "Read";
  if (pathname.startsWith("/project/")) return "Project";
  if (pathname.startsWith("/profile/")) return "Profile";
  if (pathname.startsWith("/team/")) return "Team";

  return "Verso";
}

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const pathname = usePathname();
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for screenplay title updates
  useEffect(() => {
    const handleTitleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string }>;
      setDynamicTitle(customEvent.detail.title);
    };

    window.addEventListener('screenplay-title-update', handleTitleUpdate);
    return () => window.removeEventListener('screenplay-title-update', handleTitleUpdate);
  }, []);

  const handleTitleSave = useCallback((newTitle: string) => {
    // Dispatch event to update screenplay title
    window.dispatchEvent(new CustomEvent('screenplay-title-save', {
      detail: { title: newTitle }
    }));
  }, []);

  const activeItem = getActiveItem(pathname, dynamicTitle);
  const pageTitle = getPageTitle(pathname);

  // Check if on a detail/editor page where we should show back button on mobile
  const isDetailPage = pathname.startsWith("/screenplay/") ||
                       pathname.startsWith("/board/") ||
                       pathname.startsWith("/cards/") ||
                       pathname.startsWith("/visualization/") ||
                       pathname.startsWith("/graph/") ||
                       pathname.startsWith("/shotlist/") ||
                       pathname.startsWith("/project/") ||
                       pathname.startsWith("/read/") ||
                       pathname.startsWith("/profile/") ||
                       pathname.startsWith("/team/");

  return (
    <header className={cn(
      "sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4",
      className
    )}>
      {/* Desktop only: sidebar trigger */}
      <SidebarTrigger className="-ml-1 hidden md:flex" />
      <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />

      {/* Desktop: Active item display */}
      <div className="hidden md:flex items-center">
        {activeItem.isTitle ? (
          <EditableTitle
            value={activeItem.label}
            onSave={handleTitleSave}
          />
        ) : (
          <span className="text-sm font-medium text-foreground">
            {activeItem.label}
          </span>
        )}
      </div>

      {/* Mobile: Logo or Back button on left */}
      {isDetailPage ? (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 -ml-1"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : (
        <Link href="/home" className="md:hidden">
          <Logo size={32} />
        </Link>
      )}

      {/* Mobile: Page title - shows "Menu" when menu is open */}
      <div className="md:hidden flex-1 flex items-center justify-center gap-2">
        <span className="font-semibold text-sm">{menuOpen ? "Menu" : pageTitle}</span>
        {/* Offline indicator - only shows when disconnected */}
        {!isOnline && (
          <div className="flex items-center gap-1 text-orange-500">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] font-medium">Offline</span>
          </div>
        )}
      </div>

      {/* Desktop: Individual action buttons */}
      <div className="ml-auto hidden md:flex items-center gap-1">
        {/* Offline indicator - only shows when disconnected */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 mr-2 text-orange-500">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-medium">Offline</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => window.dispatchEvent(new CustomEvent('command-palette-open'))}
          title="Search (⌘K)"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Mobile: Right-side menu */}
      <div className="md:hidden">
        <MobileHeaderMenu open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
    </header>
  );
}

export default AppHeader;
