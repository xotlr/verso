"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useMounted } from '@/hooks/use-mobile';
import {
  Settings,
  Plus,
  LayoutGrid,
  Rows3,
  BarChart3,
  PenTool,
  LogOut,
  Waypoints,
  Sparkles,
  CreditCard,
  FolderOpen,
  Film,
  User,
  Keyboard,
  BookOpen,
  LayoutTemplate,
  HelpCircle,
  Clapperboard,
  Mail,
  Users,
} from "lucide-react";
import { TbHome, TbHomeFilled } from 'react-icons/tb';
import { PiFilmScript, PiFilmScriptFill } from 'react-icons/pi';
import { RiFolder6Line, RiFolder6Fill, RiStackLine, RiStackFill } from 'react-icons/ri';
import { Logo } from "@/components/logo";

import { cn } from '@/lib/utils';
import "@/styles/sidebar-animations.css";
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { NavMenuItem } from "@/components/nav-menu-item";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts";
import { FormattingGuideDialog } from "@/components/formatting-guide-dialog";
import { TemplateSelector } from "@/components/template-selector";
import { NewProjectDialog } from "@/components/project/new-project-dialog";
import { PendingInvitesDialog } from "@/components/pending-invites-dialog";
import { UpgradeDialog } from "@/components/upgrade-dialog";
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
  const { data: session } = useSession();
  const mounted = useMounted();

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
  const [, setScreenplayTitle] = useState(propScreenplayTitle || 'Current Screenplay');

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
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Pending invites
  const { count: inviteCount } = usePendingInvites();


  // Main navigation items with filled/outline icon pairs
  // notification: true shows a small dot, number shows count
  const mainNavItems: Array<{
    title: string;
    url: string;
    icon: typeof TbHome;
    activeIcon?: typeof TbHomeFilled;
    notification?: boolean | number;
  }> = [
    {
      title: "Home",
      url: "/home",
      icon: TbHome,
      activeIcon: TbHomeFilled,
    },
    {
      title: "Screenplays",
      url: "/screenplays",
      icon: PiFilmScript,
      activeIcon: PiFilmScriptFill,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: RiFolder6Line,
      activeIcon: RiFolder6Fill,
    },
    {
      title: "Series",
      url: "/series",
      icon: RiStackLine,
      activeIcon: RiStackFill,
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
      icon: Waypoints,
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
    <Sidebar className="bg-sidebar sidebar-animated">
      {/* Header */}
      <SidebarHeader className="gap-3 p-0">
        {/* Logo - matches header height for alignment */}
        <div className="flex h-11 items-center justify-center">
          <Link href="/home" className="flex items-center justify-center">
            <Logo size={28} className="text-primary" />
          </Link>
        </div>

        {/* Create Button with Dropdown */}
        <SidebarMenu className="gap-1.5 px-2 pt-2">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip="Create"
                  className={cn(
                    "justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
                    "hover:bg-primary/90 transition-all"
                  )}
                >
                  <Plus className="h-4 w-4" />
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
        <SidebarGroup className="pt-2">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item, index) => (
                <NavMenuItem
                  key={item.url}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                  activeIcon={item.activeIcon}
                  pathname={pathname}
                  index={index}
                  notification={item.notification}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Current Screenplay Navigation - only shows on screenplay pages */}
        {/* Wrapped in mounted guard to prevent hydration mismatch */}
        {mounted && screenplayId && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-semibold">
              <PenTool className="h-4 w-4 text-primary" />
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
                    index={index}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Resources Section - Always show as dropdown menu */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton tooltip="Resources">
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
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-2 py-2">
        <SidebarMenu className="px-0">
          {/* User Account */}
          {user && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="md"
                    tooltip={user.name || "Account"}
                    className={cn(
                      "sidebar-user-button",
                      "bg-muted/50 border border-border/50 rounded-lg",
                      "hover:bg-primary/10 hover:border-primary/40",
                      "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      "p-0 justify-center"
                    )}
                  >
                    <div className="relative sidebar-avatar-animated">
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} className="object-cover rounded-md" />
                        <AvatarFallback className="bg-muted text-muted-foreground font-medium rounded-md">
                          {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {inviteCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground sidebar-notification-badge">
                          {inviteCount > 9 ? '9+' : inviteCount}
                        </span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                          {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{user.name || "User"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
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
                      <Link href="/connections" className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Connections
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
                    <DropdownMenuItem onClick={() => setUpgradeOpen(true)} className="cursor-pointer">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Upgrade to Pro
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

      {/* Dialogs */}
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        editable
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
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </Sidebar>
  );
}
