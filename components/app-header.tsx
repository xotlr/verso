"use client";

import React from "react";
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
import { Search, Bell, Settings, Maximize2 } from "lucide-react";

// Generate breadcrumbs from pathname
function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  // Filter out "home" since it's already hardcoded as the first breadcrumb
  const segments = pathname.split("/").filter(s => s && s !== "home");
  const breadcrumbs: { label: string; href?: string }[] = [];

  // Map route segments to readable labels
  const labelMap: Record<string, string> = {
    workspace: "Workspace",
    editor: "Editor",
    board: "Beat Board",
    cards: "Index Cards",
    visualization: "Reports",
    settings: "Settings",
    profile: "Profile",
    team: "Team",
    project: "Project",
  };

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Skip dynamic route segments (IDs) for href but show them
    const label = labelMap[segment] || (segment.length > 10 ? "Details" : segment);

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Breadcrumbs */}
      <Breadcrumb>
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
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-1">
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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => window.dispatchEvent(new CustomEvent('focus-mode-toggle'))}
          title="Focus Mode"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}

export default AppHeader;
