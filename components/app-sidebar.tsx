"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMounted } from '@/hooks/use-mobile';
import {
  Settings,
  Plus,
  FolderOpen,
  Film,
  Keyboard,
  BookOpen,
  LayoutTemplate,
  HelpCircle,
  PenTool,
  Clapperboard,
  Rows3,
  Waypoints,
  LayoutGrid,
} from "lucide-react";
import { TbHome, TbHomeFilled } from 'react-icons/tb';
import { PiFilmScript, PiFilmScriptFill } from 'react-icons/pi';
import { RiFolder6Line, RiFolder6Fill, RiStackLine, RiStackFill } from 'react-icons/ri';
import { Logo } from "@/components/logo";

import { cn } from '@/lib/utils';
import "@/styles/sidebar-animations.css";
import {
  DropdownMenu,
  DropdownMenuContent,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { NavMenuItem } from "@/components/nav-menu-item";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts";
import { FormattingGuideDialog } from "@/components/formatting-guide-dialog";
import { TemplateSelector } from "@/components/template-selector";
import { NewProjectDialog } from "@/components/project/new-project-dialog";

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
  const mounted = useMounted();
  const { setMode } = useSidebar();

  // Detect screenplay ID from URL if not provided as prop
  const urlScreenplayId = extractScreenplayId(pathname);

  // Only show screenplay tools when actually ON a screenplay page
  // (not based on localStorage - that's only for "Continue Writing" on Home)
  const screenplayId = propScreenplayId || urlScreenplayId;

  // Determine if we're in editor mode (on a screenplay page)
  const isEditorMode = !!screenplayId;

  // Update sidebar mode based on route
  useEffect(() => {
    setMode(isEditorMode ? 'editor' : 'library');
  }, [isEditorMode, setMode]);

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
        {/* Editor Mode: Only show editor-relevant tools */}
        {mounted && isEditorMode && screenplayId ? (
          <>
            {/* Editor Tools */}
            <SidebarGroup className="pt-2">
              <SidebarGroupLabel>Editor</SidebarGroupLabel>
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

            {/* Resources */}
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
                      <DropdownMenuItem onClick={() => setFormattingGuideOpen(true)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Formatting Guide
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                        <Keyboard className="mr-2 h-4 w-4" />
                        Keyboard Shortcuts
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        ) : (
          <>
            {/* Library Mode: Main Navigation */}
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

            {/* Resources Section */}
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
          </>
        )}
      </SidebarContent>

      {/* Footer - Settings */}
      <SidebarFooter className="px-2 py-2">
        <SidebarMenu className="px-0">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              isActive={pathname === '/settings' || pathname.startsWith('/settings?')}
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
    </Sidebar>
  );
}
