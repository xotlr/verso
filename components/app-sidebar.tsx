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
  Compass,
  Clapperboard,
  Mail,
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
import { NewProjectDialog } from "@/components/new-project-dialog";
import { PendingInvitesDialog } from "@/components/pending-invites-dialog";
import { usePendingInvites } from "@/hooks/use-pending-invites";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  screenplayId?: string;
  screenplayTitle?: string;
}

// Extract screenplay ID from pathname (e.g., /screenplay/123 -> 123)
function extractScreenplayId(pathname: string): string | null {
  const screenplayRoutes = ['/screenplay/', '/board/', '/graph/', '/cards/', '/visualization/', '/shotlist/'];
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

  // Only show screenplay tools when actually ON a screenplay page
  // (not based on localStorage - that's only for "Continue Writing" on Home)
  const screenplayId = propScreenplayId || urlScreenplayId;

  // Save screenplay ID to localStorage when detected from URL (for "Continue Writing" feature)
  useEffect(() => {
    if (urlScreenplayId) {
      localStorage.setItem('lastScreenplayId', urlScreenplayId);
    }
  }, [urlScreenplayId]);

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
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);

  // Pending invites
  const { count: inviteCount } = usePendingInvites();


  // Main navigation items
  const mainNavItems = [
    {
      title: "Home",
      url: "/home",
      icon: Home,
    },
    {
      title: "Screenplays",
      url: "/screenplays",
      icon: Film,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Folder,
    },
    {
      title: "Explore",
      url: "/explore",
      icon: Compass,
    },
  ];

  // Screenplay-specific navigation (only shown when in a screenplay context)
  const screenplayNavItems = screenplayId ? [
    {
      title: "Editor",
      url: `/screenplay/${screenplayId}`,
      icon: PenTool,
    },
    {
      title: "Shotlist",
      url: `/shotlist/${screenplayId}`,
      icon: Clapperboard,
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

        {/* Create Button with Dropdown */}
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "w-full justify-center rounded-md bg-primary text-primary-foreground shadow-sm",
                    "hover:bg-primary/90 active:scale-[0.98] transition-all",
                    isCollapsed && "px-0"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  {!isCollapsed && <span className="ml-2">Create</span>}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-48">
                <DropdownMenuItem onClick={() => setTemplateSelectorOpen(true)}>
                  <Film className="mr-2 h-4 w-4" />
                  New Screenplay
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNewProjectOpen(true)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  New Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

        {/* Current Screenplay Navigation - only shows on screenplay pages */}
        {screenplayId && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-semibold">
              {isCollapsed ? (
                <PenTool className="h-4 w-4 text-primary" />
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
        {!isCollapsed ? (
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
                <NavMenuItem
                  title="Help & Feedback"
                  url="/help"
                  icon={HelpCircle}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          /* Collapsed Resources - Dropdown menu */
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem className="flex justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="w-10 h-10 p-0 justify-center rounded-lg hover:bg-accent"
                    >
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-48">
                    <DropdownMenuLabel>Resources</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTemplateSelectorOpen(true)}>
                      <LayoutTemplate className="mr-2 h-4 w-4" />
                      Templates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFormattingGuideOpen(true)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Formatting Guide
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                      <Keyboard className="mr-2 h-4 w-4" />
                      Keyboard Shortcuts
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/help" className="flex items-center cursor-pointer">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Feedback
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/50 p-2">
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
                    <div className="relative">
                      <Avatar className="h-8 w-8 rounded-lg" key={user.image || 'no-avatar'}>
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback
                          className="rounded-lg text-white font-medium"
                          style={session?.user?.id ? getSimpleGradientStyle(session.user.id) : undefined}
                        >
                          {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {inviteCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {inviteCount > 9 ? '9+' : inviteCount}
                        </span>
                      )}
                    </div>
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
                      <Avatar className="h-8 w-8 rounded-lg" key={user.image || 'no-avatar-dropdown'}>
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
                    <DropdownMenuItem onClick={() => setInvitesOpen(true)} className="cursor-pointer">
                      <Mail className="mr-2 h-4 w-4" />
                      Invitations
                      {inviteCount > 0 && (
                        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                          {inviteCount}
                        </Badge>
                      )}
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
      />
      <NewProjectDialog
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={(project) => {
          setNewProjectOpen(false);
          router.push(`/project/${project.id}`);
        }}
      />
      <PendingInvitesDialog
        open={invitesOpen}
        onOpenChange={setInvitesOpen}
      />
    </Sidebar>
  );
}

export default AppSidebar;
