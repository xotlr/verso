"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { EditableTitle } from "@/components/editable-title";
import { SeriesBreadcrumb } from "@/components/series/series-breadcrumb";
import { Search, ChevronLeft, Share2, History, Play } from "lucide-react";
import { NotificationBell } from "@/components/notifications";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Logo } from "@/components/logo";
import { MobileHeaderMenu } from "@/components/mobile-header-menu";
import { HeaderIconButton } from "@/components/header-icon-button";
import { TooltipProvider } from "@/components/ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Breadcrumb data type for series episodes
interface BreadcrumbData {
  series: { id: string; title: string };
  season?: { id: string; number: number; title?: string | null } | null;
  episode?: { episode: number | null; episodeTitle: string | null } | null;
}

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
    timelapse: "Timelapse",
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
    "/home": "Home",
    "/screenplays": "Screenplays",
    "/projects": "Projects",
    "/settings": "Settings",
  };

  // Check exact matches first
  if (titleMap[pathname]) return titleMap[pathname];

  // Check route patterns
  if (pathname.includes("/timelapse")) return "Timelapse";
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
  const [isOnline, setIsOnline] = useState(true);
  const [breadcrumbData, setBreadcrumbData] = useState<BreadcrumbData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Clear breadcrumb when navigating away from screenplay routes
  useEffect(() => {
    if (!pathname.startsWith('/screenplay/')) {
      setBreadcrumbData(null);
    }
  }, [pathname]);

  // Listen for breadcrumb updates from screenplay editor
  useEffect(() => {
    const handleBreadcrumbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<BreadcrumbData>;
      setBreadcrumbData(customEvent.detail);
    };

    window.addEventListener('screenplay-breadcrumb-update', handleBreadcrumbUpdate);
    return () => window.removeEventListener('screenplay-breadcrumb-update', handleBreadcrumbUpdate);
  }, []);

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

  // Check if on a screenplay page (for showing screenplay-specific buttons)
  const isScreenplayPage = pathname.startsWith('/screenplay/');

  return (
    <TooltipProvider delayDuration={300}>
      <header className={cn(
        "sticky top-0 z-40 flex h-11 shrink-0 items-center gap-2 bg-sidebar px-4",
        className
      )}>
        {/* Desktop: Active item display or breadcrumb */}
        <div className="hidden md:flex items-center">
          {breadcrumbData ? (
            <SeriesBreadcrumb
              series={breadcrumbData.series}
              season={breadcrumbData.season}
              episode={breadcrumbData.episode}
            />
          ) : activeItem.isTitle ? (
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

        {/* Mobile: Back button on detail pages, Logo on main pages */}
        {isDetailPage ? (
          <button
            onClick={() => window.history.back()}
            className="md:hidden flex items-center justify-center h-9 w-9 -ml-2 rounded-md hover:bg-accent"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <Link
            href="/home"
            className="md:hidden flex items-center -ml-1"
          >
            <Logo size={28} className="text-foreground" />
          </Link>
        )}

        {/* Mobile: Page title */}
        <div className="md:hidden flex-1 flex items-center justify-center gap-2">
          <span className="font-semibold text-sm">{pageTitle}</span>
          {/* Offline indicator - only shows when disconnected */}
          {!isOnline && (
            <div className="flex items-center gap-1 text-orange-500">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-medium">Offline</span>
            </div>
          )}
        </div>

        {/* Mobile: Action buttons + Hamburger menu on right */}
        <div className="md:hidden flex items-center gap-1 -mr-1">
          {/* Screenplay-specific buttons on mobile */}
          {isScreenplayPage && (
            <>
              <HeaderIconButton
                icon={<Share2 className="h-4 w-4" />}
                tooltip="Share"
                onClick={() => window.dispatchEvent(new CustomEvent('editor-open-share'))}
              />
              <HeaderIconButton
                icon={<History className="h-4 w-4" />}
                tooltip="History"
                onClick={() => window.dispatchEvent(new CustomEvent('editor-open-version-history'))}
              />
              <HeaderIconButton
                icon={<Play className="h-4 w-4" />}
                tooltip="Timelapse"
                onClick={() => window.dispatchEvent(new CustomEvent('editor-open-timelapse'))}
              />
            </>
          )}
          <MobileHeaderMenu open={menuOpen} onOpenChange={setMenuOpen} />
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

          {/* Screenplay-specific buttons */}
          {isScreenplayPage && (
            <>
              <HeaderIconButton
                icon={<Share2 className="h-4 w-4" />}
                tooltip="Share"
                onClick={() => window.dispatchEvent(new CustomEvent('editor-open-share'))}
              />
              <HeaderIconButton
                icon={<History className="h-4 w-4" />}
                tooltip="Version History"
                onClick={() => window.dispatchEvent(new CustomEvent('editor-open-version-history'))}
              />
              <HeaderIconButton
                icon={<Play className="h-4 w-4" />}
                tooltip="View Timelapse"
                onClick={() => window.dispatchEvent(new CustomEvent('editor-open-timelapse'))}
              />
            </>
          )}

          {/* Global buttons */}
          <HeaderIconButton
            icon={<Search className="h-4 w-4" />}
            tooltip="Search (⌘K)"
            onClick={() => window.dispatchEvent(new CustomEvent('command-palette-open'))}
          />
          <ThemeToggle />
          <NotificationBell />
          <UserAvatarMenu />
        </div>
      </header>
    </TooltipProvider>
  );
}
