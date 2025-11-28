"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Home,
  Settings,
  Plus,
  LayoutGrid,
  Rows3,
  BarChart3,
  PenTool,
  LogOut,
  ChevronsUpDown,
  Sparkles,
  CreditCard,
  FolderOpen,
  Folder,
  Film,
  User,
  Keyboard,
  BookOpen,
  LayoutTemplate,
  HelpCircle,
  Clock,
  Star,
  Compass,
} from "lucide-react";
import { TeamSwitcher } from "@/components/team-switcher";

import { cn } from '@/lib/utils';
import { getSimpleGradientStyle } from '@/lib/avatar-gradient';
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
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { FormattingGuideDialog } from "@/components/formatting-guide-dialog";
import { TemplateSelector } from "@/components/template-selector";
import { Template } from "@/types/templates";

interface AppSidebarProps {
  screenplayId?: string;
  screenplayTitle?: string;
}

// Extract screenplay ID from pathname (e.g., /editor/123 -> 123)
function extractScreenplayId(pathname: string): string | null {
  const screenplayRoutes = ['/editor/', '/board/', '/graph/', '/cards/', '/visualization/'];
  for (const route of screenplayRoutes) {
    if (pathname.startsWith(route)) {
      const id = pathname.slice(route.length).split('/')[0];
      if (id) return id;
    }
  }
  return null;
}

// Fetch screenplay data from API
async function fetchScreenplayData(screenplayId: string): Promise<{ title: string }> {
  try {
    const response = await fetch(`/api/screenplays/${screenplayId}`);
    if (response.ok) {
      const screenplay = await response.json();
      return {
        title: screenplay.title || 'Untitled Screenplay',
      };
    }
  } catch (e) {
    console.error('Error fetching screenplay data:', e);
  }
  return { title: 'Current Screenplay' };
}

export function AppSidebar({ screenplayId: propScreenplayId, screenplayTitle: propScreenplayTitle }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const { data: session } = useSession();
  const isCollapsed = state === "collapsed";

  const user = session?.user;

  // Detect screenplay ID from URL if not provided as prop
  const urlScreenplayId = extractScreenplayId(pathname);

  // Initialize lastScreenplayId as null, then hydrate from localStorage after mount
  const [lastScreenplayId, setLastScreenplayId] = useState<string | null>(null);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const stored = localStorage.getItem('lastScreenplayId');
    if (stored) {
      setLastScreenplayId(stored);
    }
  }, []);

  // Save screenplay ID to localStorage when detected from URL
  useEffect(() => {
    if (urlScreenplayId) {
      localStorage.setItem('lastScreenplayId', urlScreenplayId);
      setLastScreenplayId(urlScreenplayId);
    }
  }, [urlScreenplayId]);

  // Use URL screenplay, prop screenplay, or last opened screenplay
  const screenplayId = propScreenplayId || urlScreenplayId || lastScreenplayId;

  // Get screenplay title from props or localStorage
  const [screenplayTitle, setScreenplayTitle] = useState(propScreenplayTitle || 'Current Screenplay');

  // Fetch screenplay data from API
  useEffect(() => {
    if (screenplayId && !propScreenplayTitle) {
      fetchScreenplayData(screenplayId).then(({ title }) => {
        setScreenplayTitle(title);
      });
    }
  }, [screenplayId, propScreenplayTitle]);

  // Dialog states
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [formattingGuideOpen, setFormattingGuideOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Handle template selection
  const handleTemplateSelect = async (template: Template) => {
    try {
      const response = await fetch('/api/screenplays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.name === 'Blank Screenplay' ? 'Untitled Screenplay' : template.name,
          content: template.content,
        }),
      });

      if (response.ok) {
        const screenplay = await response.json();
        router.push(`/editor/${screenplay.id}`);
      }
    } catch (error) {
      console.error('Error creating screenplay:', error);
    }
  };

  // Main navigation items
  const mainNavItems = [
    {
      title: "Home",
      url: "/home",
      icon: Home,
    },
    {
      title: "Explore",
      url: "/explore",
      icon: Compass,
    },
    {
      title: "Recent",
      url: "/recent",
      icon: Clock,
    },
    {
      title: "Favorites",
      url: "/favorites",
      icon: Star,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Folder,
    },
  ];

  // Screenplay-specific navigation (only shown when in a screenplay context)
  const screenplayNavItems = screenplayId ? [
    {
      title: "Editor",
      url: `/editor/${screenplayId}`,
      icon: PenTool,
    },
    {
      title: "Beat Board",
      url: `/board/${screenplayId}`,
      icon: Rows3,
    },
    {
      title: "Story Graph",
      url: `/graph/${screenplayId}`,
      icon: Sparkles,
    },
    {
      title: "Index Cards",
      url: `/cards/${screenplayId}`,
      icon: LayoutGrid,
    },
    {
      title: "Reports",
      url: `/visualization/${screenplayId}`,
      icon: BarChart3,
    },
  ] : [];

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      {/* Header */}
      <SidebarHeader className="border-b border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <TeamSwitcher isCollapsed={isCollapsed} />
          </SidebarMenuItem>
        </SidebarMenu>

        {/* New Buttons */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href="/home?newProject=true"
                className={cn(
                  "w-full justify-center border border-dashed border-border rounded-md",
                  "hover:bg-accent hover:text-accent-foreground",
                  isCollapsed && "px-0"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">New Project</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href="/home?new=true"
                className={cn(
                  "w-full justify-center border border-dashed border-border rounded-md",
                  "hover:bg-accent hover:text-accent-foreground",
                  isCollapsed && "px-0"
                )}
              >
                <Plus className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">New Screenplay</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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

        {/* Current Screenplay Navigation */}
        {screenplayId && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {isCollapsed ? (
                <Film className="h-4 w-4" />
              ) : (
                <span className="truncate">{screenplayTitle || "Current Screenplay"}</span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {screenplayNavItems.map((item, index) => (
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

        {/* Resources Section */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Resources</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavMenuItem
                  title="Templates"
                  icon={LayoutTemplate}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  onClick={() => setTemplateSelectorOpen(true)}
                />
                <NavMenuItem
                  title="Formatting Guide"
                  icon={BookOpen}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  onClick={() => setFormattingGuideOpen(true)}
                />
                <NavMenuItem
                  title="Keyboard Shortcuts"
                  icon={Keyboard}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  onClick={() => setShortcutsOpen(true)}
                />
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="https://docs.verso.film" target="_blank" rel="noopener noreferrer" className="w-full px-3 py-1.5 transition-all duration-150 text-sm group/item flex items-center rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                      <div className="inline-block mr-2">
                        <HelpCircle className="h-4 w-4 transition-colors duration-150 group-hover/item:text-foreground" />
                      </div>
                      <span className="font-medium">Help</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
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
                      <AvatarFallback
                        className="rounded-lg text-white font-medium"
                        style={session?.user?.id ? getSimpleGradientStyle(session.user.id) : undefined}
                      >
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
                        <AvatarFallback
                          className="rounded-lg text-white font-medium"
                          style={session?.user?.id ? getSimpleGradientStyle(session.user.id) : undefined}
                        >
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
                      <Link href={`/profile/${session?.user?.id}`} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        View Profile
                      </Link>
                    </DropdownMenuItem>
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

      {/* Dialogs */}
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
      <FormattingGuideDialog
        open={formattingGuideOpen}
        onOpenChange={setFormattingGuideOpen}
      />
      <TemplateSelector
        isOpen={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelect={handleTemplateSelect}
      />
    </Sidebar>
  );
}

export default AppSidebar;
