"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FolderOpen,
  Settings,
  Plus,
  FileText,
  LayoutGrid,
  Rows3,
  BarChart3,
  PenTool,
} from "lucide-react";

import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavMenuItem } from "@/components/nav-menu-item";

interface AppSidebarProps {
  projectId?: string;
  projectTitle?: string;
}

// Extract project ID from pathname (e.g., /editor/123 -> 123)
function extractProjectId(pathname: string): string | null {
  const projectRoutes = ['/editor/', '/board/', '/cards/', '/visualization/'];
  for (const route of projectRoutes) {
    if (pathname.startsWith(route)) {
      const id = pathname.slice(route.length).split('/')[0];
      if (id) return id;
    }
  }
  return null;
}

// Get project title from localStorage
function getProjectTitle(projectId: string): string {
  if (typeof window === 'undefined') return 'Current Project';
  try {
    const data = localStorage.getItem(`screenplay_${projectId}`);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.title || 'Untitled Project';
    }
  } catch (e) {
    console.error('Error getting project title:', e);
  }
  return 'Current Project';
}

export function AppSidebar({ projectId: propProjectId, projectTitle: propProjectTitle }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Detect project ID from URL if not provided as prop
  const urlProjectId = extractProjectId(pathname);
  const projectId = propProjectId || urlProjectId;

  // Get project title from props or localStorage
  const [projectTitle, setProjectTitle] = useState(propProjectTitle || 'Current Project');

  useEffect(() => {
    if (projectId && !propProjectTitle) {
      setProjectTitle(getProjectTitle(projectId));
    }
  }, [projectId, propProjectTitle]);

  // Main navigation items
  const mainNavItems = [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Workspace",
      url: "/workspace",
      icon: FolderOpen,
    },
  ];

  // Project-specific navigation (only shown when in a project context)
  const projectNavItems = projectId ? [
    {
      title: "Editor",
      url: `/editor/${projectId}`,
      icon: PenTool,
    },
    {
      title: "Beat Board",
      url: `/board/${projectId}`,
      icon: Rows3,
    },
    {
      title: "Index Cards",
      url: `/cards/${projectId}`,
      icon: LayoutGrid,
    },
    {
      title: "Reports",
      url: `/visualization/${projectId}`,
      icon: BarChart3,
    },
  ] : [];

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      {/* Header */}
      <SidebarHeader className="border-b border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="gap-3">
              <Link href="/" className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-xl font-bold italic">V</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">Verso</span>
                  <span className="text-xs text-muted-foreground">Screenwriting</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* New Project Button */}
        <div className="px-2 pb-2">
          <Button
            asChild
            size={isCollapsed ? "icon" : "default"}
            className={cn(
              "w-full bg-gradient-to-br from-primary via-primary to-primary/80",
              "hover:from-primary/90 hover:via-primary/90 hover:to-primary/70",
              "shadow-md hover:shadow-lg transition-all",
              isCollapsed && "w-10 h-10"
            )}
          >
            <Link href="/workspace?new=true">
              <Plus className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && "New Project"}
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item, index) => (
                <NavMenuItem
                  key={item.url}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  index={index}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Current Project Navigation */}
        {projectId && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {isCollapsed ? (
                <FileText className="h-4 w-4" />
              ) : (
                <span className="truncate">{projectTitle || "Current Project"}</span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNavItems.map((item, index) => (
                  <NavMenuItem
                    key={item.url}
                    title={item.title}
                    url={item.url}
                    icon={item.icon}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                    index={index}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/50">
        <SidebarMenu>
          {/* Theme Toggle */}
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center justify-center py-2",
              isCollapsed && "flex-col"
            )}>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>

          {/* Settings */}
          <NavMenuItem
            title="Settings"
            url="/settings"
            icon={Settings}
            pathname={pathname}
            isCollapsed={isCollapsed}
          />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
