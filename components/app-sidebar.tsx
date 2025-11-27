"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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
  LogOut,
  ChevronsUpDown,
  Sparkles,
  CreditCard,
} from "lucide-react";

import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { data: session } = useSession();
  const isCollapsed = state === "collapsed";

  const user = session?.user;

  // Detect project ID from URL if not provided as prop
  const urlProjectId = extractProjectId(pathname);
  const projectId = propProjectId || urlProjectId;

  // Get project title from props or localStorage
  const [projectTitle, setProjectTitle] = useState(propProjectTitle || 'Current Project');
  const [sceneCount, setSceneCount] = useState(0);

  useEffect(() => {
    if (projectId && !propProjectTitle) {
      setProjectTitle(getProjectTitle(projectId));
    }
  }, [projectId, propProjectTitle]);

  // Get scene count from localStorage
  useEffect(() => {
    if (projectId) {
      try {
        const data = localStorage.getItem(`screenplay_${projectId}`);
        if (data) {
          const parsed = JSON.parse(data);
          const scenes = parsed.scenes?.length || 0;
          setSceneCount(scenes);
        }
      } catch (e) {
        console.error('Error getting scene count:', e);
      }
    } else {
      setSceneCount(0);
    }
  }, [projectId]);

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
            <SidebarMenuButton asChild size="lg" className="gap-2">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold italic text-primary">V</span>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">Verso</span>
                  <span className="text-xs text-muted-foreground">Screenwriting</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* New Project Button */}
        <div className={cn("px-2 pb-2", isCollapsed && "px-1")}>
          <Button
            asChild
            size={isCollapsed ? "icon" : "default"}
            className={cn(
              "w-full",
              !isCollapsed && "bg-gradient-to-br from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg",
              isCollapsed && "h-8 w-8"
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

        {/* Quick Stats (only when in project) */}
        {projectId && sceneCount > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {isCollapsed ? (
                <BarChart3 className="h-4 w-4" />
              ) : (
                "Stats"
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className={cn(
                "px-3 py-2 text-xs text-muted-foreground space-y-1",
                isCollapsed && "hidden"
              )}>
                <div className="flex justify-between">
                  <span>Scenes</span>
                  <span className="font-medium text-foreground">{sceneCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Pages</span>
                  <span className="font-medium text-foreground">~{Math.round(sceneCount * 1.5)}</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/50">
        <SidebarMenu>
          {/* User Account */}
          {user && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      isCollapsed && "justify-center"
                    )}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">{user.name || "User"}</span>
                          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4" />
                      </>
                    )}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user.name || "User"}</span>
                        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to Pro
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings?tab=billing" className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
