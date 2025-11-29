"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileHeaderMenu } from "@/components/mobile-header-menu";
import { EditableTitle } from "@/components/editable-title";
import { Search, Bell, Settings } from "lucide-react";

// Generate breadcrumbs from pathname
function getBreadcrumbs(pathname: string, dynamicTitle: string | null): {
  label: string;
  href?: string;
  isTitle?: boolean;
}[] {
  const segments = pathname.split("/").filter(s => s && s !== "home");
  const breadcrumbs: { label: string; href?: string; isTitle?: boolean }[] = [];

  const labelMap: Record<string, string> = {
    screenplays: "Screenplays",
    projects: "Projects",
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

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Check if this segment looks like an entity ID (CUID or UUID) and we have a dynamic title
    // CUIDs are 25+ alphanumeric chars, UUIDs are 36 chars with dashes
    const isEntityId = segment.match(/^[a-z0-9]{20,}$/i) || segment.match(/^[a-f0-9-]{36}$/);
    const label = (isEntityId && dynamicTitle)
      ? dynamicTitle
      : (labelMap[segment] || (isEntityId ? "Loading..." : segment));

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      isTitle: isEntityId && dynamicTitle ? true : false,
    });
  });

  return breadcrumbs;
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

export function AppHeader() {
  const pathname = usePathname();
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);

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

  const breadcrumbs = getBreadcrumbs(pathname, dynamicTitle);
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Desktop only: sidebar trigger */}
      <SidebarTrigger className="-ml-1 hidden md:flex" />
      <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />

      {/* Desktop: Breadcrumbs */}
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/home">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : crumb.isTitle ? (
                  <EditableTitle
                    value={crumb.label}
                    onSave={handleTitleSave}
                  />
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile: Page title */}
      <div className="md:hidden flex-1 text-center">
        <span className="font-semibold text-sm">{pageTitle}</span>
      </div>

      {/* Desktop: Individual action buttons */}
      <div className="ml-auto hidden md:flex items-center gap-1">
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
        <MobileHeaderMenu />
      </div>
    </header>
  );
}

export default AppHeader;
