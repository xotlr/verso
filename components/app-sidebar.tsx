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
  Users,
} from "lucide-react";
import { TbHome, TbHomeFilled } from 'react-icons/tb';
import { PiFilmScript, PiFilmScriptFill } from 'react-icons/pi';
import { RiFolder6Line, RiFolder6Fill, RiStackLine, RiStackFill, RiGroup2Fill, RiGroup2Line } from 'react-icons/ri';
import { BiEdit, BiSolidEdit } from 'react-icons/bi';
import { BsCameraReels, BsCameraReelsFill, BsGrid3X3Gap, BsGrid3X3GapFill } from 'react-icons/bs';
import { PiNeedleFill } from 'react-icons/pi';
import { TbNeedleThread } from 'react-icons/tb';
import { HiFilm, HiOutlineFilm } from "react-icons/hi2";
import { FaNoteSticky, FaRegNoteSticky } from "react-icons/fa6";
import { Logo } from "@/components/logo";
import { useEditorUIOptional, type EditorPanelType } from '@/contexts/editor-ui-context';

import { cn } from '@/lib/utils';
import { useIsGlass } from '@/hooks/use-glass-styles';
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
  useSidebar,
} from "@/components/ui/sidebar";
import { NavMenuItem } from "@/components/nav-menu-item";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts";
import { FormattingGuideDialog } from "@/components/formatting-guide-dialog";
import { TemplateSelector } from "@/components/template-selector";
import { NewProjectDialog } from "@/components/project/new-project-dialog";
import { CreateTeamDialog } from "@/components/team/create-team-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppSidebarProps {
  screenplayId?: string;
  screenplayTitle?: string;
}

// Extract screenplay ID from pathname (e.g., /screenplay/123 -> 123)
function extractScreenplayId(pathname: string): string | null {
  const screenplayRoutes = ['/screenplay/', '/tapestry/', '/cards/', '/visualization/', '/shotlist/'];
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
  const isGlass = useIsGlass();

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
  const [newTeamOpen, setNewTeamOpen] = useState(false);

  // Get panel state directly from context (no more window events!)
  const editorUI = useEditorUIOptional();
  const activePanel = editorUI?.panelOpen ? editorUI.activePanel : null;
  const panelCounts = editorUI?.counts ?? { scenes: 0, characters: 0, shots: 0, notes: 0 };

  // Toggle panel from sidebar using context
  const handlePanelToggle = (panel: EditorPanelType) => {
    editorUI?.setPanel(panel);
  };


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
  // Note: Shotlist removed - accessible via panel toggle + "Full page" link
  const screenplayNavItems = screenplayId ? [
    {
      title: "Editor",
      url: `/screenplay/${screenplayId}`,
      icon: BiEdit,
      activeIcon: BiSolidEdit,
    },
    {
      title: "Tapestry",
      url: `/tapestry/${screenplayId}`,
      icon: PiNeedleFill,
      activeIcon: TbNeedleThread,
    },
    {
      title: "Index Cards",
      url: `/cards/${screenplayId}`,
      icon: BsGrid3X3Gap,
      activeIcon: BsGrid3X3GapFill,
    },
  ] : [];

  return (
    <Sidebar className="sidebar-animated">
      {/* Header */}
      <SidebarHeader className="gap-2 px-2 pt-0 pb-0">
        {/* Logo - aligned with app header (h-11 = 44px) */}
        <div className="flex h-11 items-center justify-center">
          <Link href="/home" className="flex items-center justify-center">
            <Logo size={22} className="text-primary hover:opacity-80 transition-opacity" />
          </Link>
        </div>

        {/* Create Button with Dropdown */}
        <SidebarMenu className="px-0 pb-1">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip="Create"
                  className={cn(
                    "justify-center rounded-lg bg-primary text-primary-foreground",
                    "hover:bg-primary/90 transition-all",
                    "data-[state=open]:text-background"
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
                <DropdownMenuItem onClick={() => setNewTeamOpen(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  New Team
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
            {/* Editor Tools + Panel Toggles - glass pill wrapper for limitless */}
            <div className={cn(
              isGlass
                ? "mx-2 p-1 rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/10"
                : "mx-2 p-1 rounded-xl bg-muted border border-border/60"
            )}>
              <SidebarMenu className={cn(isGlass && "px-0 gap-0.5")}>
                {screenplayNavItems.map((item, index) => (
                  <NavMenuItem
                    key={item.url}
                    title={item.title}
                    url={item.url}
                    icon={item.icon}
                    activeIcon={item.activeIcon}
                    pathname={pathname}
                    index={index}
                    isGlass={isGlass}
                  />
                ))}
                {pathname === `/screenplay/${screenplayId}` && (
                  <>
                    <NavMenuItem
                      title={`Scenes${panelCounts.scenes ? ` (${panelCounts.scenes})` : ''}`}
                      icon={HiOutlineFilm}
                      activeIcon={HiFilm}
                      pathname={pathname}
                      onClick={() => handlePanelToggle('scenes')}
                      isActive={activePanel === 'scenes'}
                      notification={panelCounts.scenes > 0}
                      isGlass={isGlass}
                    />
                    <NavMenuItem
                      title={`Characters${panelCounts.characters ? ` (${panelCounts.characters})` : ''}`}
                      icon={RiGroup2Line}
                      activeIcon={RiGroup2Fill}
                      pathname={pathname}
                      onClick={() => handlePanelToggle('characters')}
                      isActive={activePanel === 'characters'}
                      notification={panelCounts.characters > 0}
                      isGlass={isGlass}
                    />
                    <NavMenuItem
                      title={`Shotlist${panelCounts.shots ? ` (${panelCounts.shots})` : ''}`}
                      icon={BsCameraReels}
                      activeIcon={BsCameraReelsFill}
                      pathname={pathname}
                      onClick={() => handlePanelToggle('shotlist')}
                      isActive={activePanel === 'shotlist'}
                      notification={panelCounts.shots > 0}
                      isGlass={isGlass}
                    />
                    <NavMenuItem
                      title={`Notes${panelCounts.notes ? ` (${panelCounts.notes})` : ''}`}
                      icon={FaRegNoteSticky}
                      activeIcon={FaNoteSticky}
                      pathname={pathname}
                      onClick={() => handlePanelToggle('notes')}
                      isActive={activePanel === 'notes'}
                      notification={panelCounts.notes > 0}
                      isGlass={isGlass}
                    />
                  </>
                )}
              </SidebarMenu>
            </div>

            {/* Resources */}
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
          </>
        ) : (
          <>
            {/* Library Mode: Main Navigation - glass pill wrapper for limitless */}
            <div className={cn(
              isGlass
                ? "mx-2 p-1 rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/10"
                : "mx-2 p-1 rounded-xl bg-muted border border-border/60"
            )}>
              <SidebarMenu className={cn(isGlass && "px-0 gap-0.5")}>
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
                    isGlass={isGlass}
                  />
                ))}
              </SidebarMenu>
            </div>

            {/* Resources */}
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
          </>
        )}
      </SidebarContent>

      {/* Footer - Theme Toggle & Settings */}
      <SidebarFooter className="px-2 pt-0 pb-2">
        <SidebarMenu className="px-0 gap-1.5">
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              isActive={pathname === '/settings' || pathname.startsWith('/settings?')}
            >
              <Link href="/settings">
                <Settings className="h-4 w-4 text-muted-foreground" />
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
      <CreateTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
      />
    </Sidebar>
  );
}
