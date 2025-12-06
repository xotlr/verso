'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Smart algorithm to determine if a greeting works with a name appended
function shouldShowName(greeting: string): boolean {
  // Never show name if greeting contains "you" or "your" (already addresses user)
  if (/\byou\b|\byour\b/i.test(greeting)) return false;

  // Never show name for complete sentences (ends with period, !, or ?)
  if (/[.!?]$/.test(greeting)) return false;

  // Never show name for metaphorical/poetic phrases
  const skipPatterns = [
    /awaits/i, /begins/i, /activated/i, /engaged/i, /incoming/i,
    /loading/i, /mode:/i, /thickens/i, /calling/i, /strikes/i,
    /flows/i, /blinks/i, /fears/i, /counts/i, /misses/i
  ];
  if (skipPatterns.some(p => p.test(greeting))) return false;

  // Show name for direct address patterns
  const directAddressPatterns = [
    /^good (morning|afternoon|evening|night)/i,
    /^welcome/i, /^hey/i, /^hello/i, /^hi\b/i,
    /^happy/i
  ];
  if (directAddressPatterns.some(p => p.test(greeting))) return true;

  // Show name for short phrases (2-3 words) without colons
  const words = greeting.split(' ');
  if (words.length <= 3 && !greeting.includes(':')) return true;

  // Default: don't show name
  return false;
}

// ============================================================================
// CONTEXTUAL GREETING SYSTEM
// Behavior-reactive greetings that notice user patterns and get "unhinged"
// ============================================================================

interface GreetingContext {
  userName?: string | null;
  screenplayCount: number;
  wordsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  lastWriteDate: string | null;
}

type GreetingCategory =
  | 'LEGENDARY'
  | 'GHOST_LONG'
  | 'GHOST_MEDIUM'
  | 'GHOST_SHORT'
  | 'RETURNING_CHAMP'
  | 'ON_FIRE'
  | 'CREATOR_NOT_WRITER'
  | 'STREAK_BROKEN'
  | 'CRUSHING_IT'
  | 'SLACKING'
  | 'FIRST_TIME'
  | 'TIME_BASED';

// GHOST greetings - scaled by days absent
const ghostGreetingsShort = [ // 3-4 days
  "Oh, so you DO remember this exists",
  "The prodigal writer returns",
  "Well well well... look who decided to show up",
  "Back from the dead, I see",
  "The scripts were starting to worry",
];

const ghostGreetingsMedium = [ // 5-6 days
  "I was starting to think you forgot how to type",
  "*blows dust off keyboard* Welcome back",
  "The scripts were getting lonely",
  "Almost filed a missing persons report",
  "The blank pages held a vigil",
];

const ghostGreetingsLong = [ // 7+ days
  "It's been a while. A LONG while.",
  "I was about to file a missing persons report",
  "The blank pages staged a protest. They're back now",
  "Did you get lost? For over a week?!",
  "The muse almost gave up on you",
  "Resurrection complete. Welcome back",
];

// LEGENDARY greetings (7+ day streak)
const legendaryGreetings = [
  "UNSTOPPABLE!",
  "At this point you're just showing off",
  "Are you even human?!",
  "The writing gods have blessed you",
  "Legend. Absolute legend",
  "Writing machine activated",
  "They'll write legends about this streak",
  "Peak performance unlocked",
];

// ON_FIRE greetings (3-6 day streak)
const onFireGreetings = [
  "You're on FIRE",
  "The legend continues",
  "Streak mode: activated",
  "Unstoppable momentum",
  "Keep that fire burning",
  "The muse is obsessed with you",
];

// RETURNING_CHAMP greetings (matching or beating longest streak)
const returningChampGreetings = [
  "You've matched your personal best!",
  "This is your LONGEST STREAK EVER",
  "Historic moment. You're making history",
  "New personal record territory",
  "The champion has returned",
];

// STREAK_BROKEN greetings
const streakBrokenGreetings = [
  "The streak... it's gone. But you're here now",
  "Yesterday happened. Today's a new day",
  "We don't talk about yesterday",
  "Starting fresh. No judgment. (Okay, a little judgment)",
  "The counter reset. Your talent didn't",
  "Back to day one. Let's make it count",
];

// CREATOR_NOT_WRITER greetings (many screenplays, no words this week)
const creatorNotWriterGreetings = [
  "Another new screenplay? How about finishing one?",
  "I see you like the 'New Screenplay' button",
  "Creating is easy. Writing is the hard part",
  "Interesting strategy. Many files, zero words",
  "The 'new file' button fears you. Your current drafts miss you",
  "Collection growing, word count... not so much",
];

// CRUSHING_IT greetings (high weekly output)
const crushingItGreetings = [
  "Save some talent for the rest of us",
  "At this rate you'll finish by Tuesday",
  "The keyboard called. It needs a break",
  "Absolute writing rampage",
  "The productivity is off the charts",
  "Slow down, Shakespeare",
];

// SLACKING greetings (below daily goal)
const slackingGreetings = [
  "Your daily goal misses you",
  "The blank page is judging you (lovingly)",
  "Just a few words. That's all I ask",
  "The cursor has been blinking for days",
  "Your characters are waiting",
];

// FIRST_TIME greetings (no screenplays)
const firstTimeGreetings = [
  "Your blank page awaits",
  "Every great writer started here",
  "Chapter one begins now",
  "The cursor blinks with possibility",
  "Your first masterpiece awaits",
  "Welcome to the writer's life",
];

// Helper to pick from array with seed
function pickFromPool(pool: string[], seed: number): string {
  return pool[seed % pool.length];
}

// Calculate days since last write
function getDaysSinceLastWrite(lastWriteDate: string | null): number | null {
  if (!lastWriteDate) return null;
  const last = new Date(lastWriteDate);
  const now = new Date();
  const diffTime = now.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Main contextual greeting function
function getContextualGreeting(ctx: GreetingContext): {
  text: string;
  showName: boolean;
  name?: string;
  category: GreetingCategory;
} {
  const {
    userName,
    screenplayCount,
    wordsThisWeek,
    currentStreak,
    longestStreak,
    dailyGoal,
    lastWriteDate
  } = ctx;

  const firstName = userName?.split(' ')[0];
  const minuteSeed = Math.floor(Date.now() / 60000);
  const daysSinceWrite = getDaysSinceLastWrite(lastWriteDate);

  // Priority 1: LEGENDARY (7+ day streak) - Peak celebration
  if (currentStreak >= 7) {
    const text = `${pickFromPool(legendaryGreetings, minuteSeed)} ${currentStreak} days!`;
    return { text, showName: false, name: firstName, category: 'LEGENDARY' };
  }

  // Priority 2: GHOST detection (3+ days absent)
  if (daysSinceWrite !== null && daysSinceWrite >= 3) {
    let pool: string[];
    let category: GreetingCategory;

    if (daysSinceWrite >= 7) {
      pool = ghostGreetingsLong;
      category = 'GHOST_LONG';
    } else if (daysSinceWrite >= 5) {
      pool = ghostGreetingsMedium;
      category = 'GHOST_MEDIUM';
    } else {
      pool = ghostGreetingsShort;
      category = 'GHOST_SHORT';
    }

    const text = pickFromPool(pool, minuteSeed);
    return { text, showName: false, name: firstName, category };
  }

  // Priority 3: RETURNING_CHAMP (matching or exceeding longest streak, streak >= 5)
  if (currentStreak >= 5 && currentStreak >= longestStreak && longestStreak > 0) {
    const text = `${pickFromPool(returningChampGreetings, minuteSeed)} ${currentStreak} days!`;
    return { text, showName: false, name: firstName, category: 'RETURNING_CHAMP' };
  }

  // Priority 4: ON_FIRE (3-6 day streak)
  if (currentStreak >= 3) {
    const text = `${currentStreak}-day streak! ${pickFromPool(onFireGreetings, minuteSeed)}`;
    return { text, showName: false, name: firstName, category: 'ON_FIRE' };
  }

  // Priority 5: CREATOR_NOT_WRITER (many screenplays, 0 words this week)
  if (screenplayCount > 5 && wordsThisWeek === 0) {
    const text = pickFromPool(creatorNotWriterGreetings, minuteSeed);
    return { text, showName: false, name: firstName, category: 'CREATOR_NOT_WRITER' };
  }

  // Priority 6: STREAK_BROKEN (streak is 0 but had one before)
  if (currentStreak === 0 && longestStreak > 0 && daysSinceWrite !== null && daysSinceWrite >= 1 && daysSinceWrite < 3) {
    const text = pickFromPool(streakBrokenGreetings, minuteSeed);
    return { text, showName: false, name: firstName, category: 'STREAK_BROKEN' };
  }

  // Priority 7: Productivity levels
  if (wordsThisWeek > dailyGoal * 5) {
    const text = `${wordsThisWeek.toLocaleString()} words this week?! ${pickFromPool(crushingItGreetings, minuteSeed)}`;
    return { text, showName: false, name: firstName, category: 'CRUSHING_IT' };
  }

  if (wordsThisWeek < dailyGoal && screenplayCount > 0 && wordsThisWeek === 0) {
    const text = pickFromPool(slackingGreetings, minuteSeed);
    return { text, showName: false, name: firstName, category: 'SLACKING' };
  }

  // Priority 8: First time user
  if (screenplayCount === 0) {
    const text = pickFromPool(firstTimeGreetings, minuteSeed);
    return { text, showName: shouldShowName(text), name: firstName, category: 'FIRST_TIME' };
  }

  // Priority 9: Fall back to time-based greeting
  return getTimeBasedGreeting(userName);
}

// Time-based greeting fallback (original system)
function getTimeBasedGreeting(userName?: string | null): {
  text: string;
  showName: boolean;
  name?: string;
  category: GreetingCategory;
} {
  const now = new Date();
  const hour = now.getHours();
  const firstName = userName?.split(' ')[0];
  const minuteSeed = Math.floor(Date.now() / 60000);

  const timeGreetings: Record<string, string[]> = {
    morning: [
      "Rise and write", "Morning muse reporting for duty", "Coffee's ready, screenplay's waiting",
      "Dawn of a new scene", "The early bird writes the script", "Fresh morning, fresh pages",
      "Good morning, wordsmith", "Good morning", "Time to caffeinate and create",
    ],
    afternoon: [
      "Afternoon plot twist incoming", "Prime writing hours activated", "Post-lunch creativity surge",
      "Afternoon act two", "Good afternoon", "Peak creativity hours", "Midday momentum",
    ],
    evening: [
      "Evening pages await", "Golden hour for golden dialogue", "The evening draft calls",
      "Evening writing ritual", "Good evening", "Sunset scripting", "The evening muse awakens",
    ],
    night: [
      "Burning the midnight oil", "Night owl mode: engaged", "The muse works late tonight",
      "Moonlit manuscript time", "Late night legends are written now", "Quiet hours, loud ideas",
      "Night writer", "After hours creativity",
    ],
  };

  const timePeriod =
    (hour >= 5 && hour < 12) ? "morning" :
    (hour >= 12 && hour < 17) ? "afternoon" :
    (hour >= 17 && hour < 21) ? "evening" : "night";

  const pool = timeGreetings[timePeriod];
  const text = pool[minuteSeed % pool.length];

  return {
    text,
    showName: shouldShowName(text),
    name: firstName,
    category: 'TIME_BASED',
  };
}

import { SettingsPanel } from '@/components/settings-panel';
import { CommandPalette } from '@/components/command-palette';
import { TemplateSelector } from '@/components/template-selector';
import { NewProjectDialog } from '@/components/new-project-dialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ImportDropZoneCard, ImportResult } from '@/components/import-drop-zone';
import { ListPageToolbar, FilterPill } from '@/components/ui/list-page-toolbar';
import { Plus, Star } from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';
import { PendingInviteBanner } from '@/components/pending-invite-banner';
import { PendingProjectRoleInviteBanner } from '@/components/pending-project-role-invite-banner';
import { StatsCards } from '@/components/dashboard';
import { PageLayout } from '@/components/layouts/page-layout';
import { ScreenplayListCard, ScreenplayListCardSkeleton } from '@/components/screenplay-list-card';
import { ProjectFolderCard, ProjectFolderCardSkeleton } from '@/components/project-folder-card';

interface ScreenplayItem {
  id: string;
  title: string;
  content: string;
  logline?: string | null;
  synopsis?: string | null;
  updatedAt: string;
  wordCount: number;
  genre?: string | null;
  isFavorite?: boolean;
  projectId: string | null;
  project?: { id: string; name: string } | null;
  author?: string | null;
  user?: { id: string; name: string | null } | null;
}

interface ProjectRole {
  id: string;
  role: string;
  name: string;
  userId?: string | null;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  banner: string | null;
  logo: string | null;
  updatedAt: string;
  roles?: ProjectRole[];
  screenplays?: { id: string; title: string }[];
  _count: {
    screenplays: number;
    notes: number;
    schedules: number;
    budgets: number;
  };
}

interface DashboardStats {
  screenplayCount: number;
  projectCount: number;
  wordsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  lastWriteDate: string | null;
}

type TabValue = 'screenplays' | 'projects';

function WorkspacePageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [screenplays, setScreenplays] = useState<ScreenplayItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Contextual greeting based on user behavior, streaks, activity, and time
  const greeting = useMemo(
    () => getContextualGreeting({
      userName: session?.user?.name,
      screenplayCount: screenplays.length,
      wordsThisWeek: dashboardStats?.wordsThisWeek || 0,
      currentStreak: dashboardStats?.currentStreak || 0,
      longestStreak: dashboardStats?.longestStreak || 0,
      dailyGoal: dashboardStats?.dailyGoal || 500,
      lastWriteDate: dashboardStats?.lastWriteDate || null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.user?.name, screenplays.length, dashboardStats, Math.floor(Date.now() / 60000)]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'screenplay' | 'project' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('screenplays');
  const [showFavorites, setShowFavorites] = useState(false);


  useEffect(() => {
    loadData();
  }, []);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    const handleCommandPaletteOpen = () => {
      setCommandPaletteOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('command-palette-open', handleCommandPaletteOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('command-palette-open', handleCommandPaletteOpen);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [screenplaysRes, projectsRes, statsRes] = await Promise.all([
        fetch('/api/screenplays'),
        fetch('/api/projects'),
        fetch('/api/dashboard/stats'),
      ]);

      if (screenplaysRes.ok) {
        const data = await screenplaysRes.json();
        setScreenplays(data.screenplays || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data);
      }

      if (statsRes.ok) {
        setDashboardStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewScreenplay = () => {
    setTemplateSelectorOpen(true);
  };

  const createNewProject = () => {
    setNewProjectOpen(true);
  };

  const handleProjectCreated = (project: ProjectItem) => {
    setProjects((prev) => [project, ...prev]);
    setNewProjectOpen(false);
    router.push(`/project/${project.id}`);
  };

  const deleteItem = (id: string, type: 'screenplay' | 'project') => {
    setDeleteTarget({ id, type });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const endpoint = deleteTarget.type === 'screenplay'
        ? `/api/screenplays/${deleteTarget.id}`
        : `/api/projects/${deleteTarget.id}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(`Failed to delete ${deleteTarget.type}`);
      }

      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const exportScreenplay = (screenplay: ScreenplayItem) => {
    const blob = new Blob([screenplay.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${screenplay.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportComplete = async (result: ImportResult) => {
    if (!result.success || !result.content) return;

    try {
      const response = await fetch('/api/screenplays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title || 'Imported Screenplay',
          content: result.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create screenplay');
      }

      const screenplay = await response.json();
      router.push(`/editor/${screenplay.id}`);
    } catch (error) {
      console.error('Error importing screenplay:', error);
    }
  };

  const filteredScreenplays = screenplays
    .filter(screenplay => {
      const matchesSearch = screenplay.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        screenplay.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorites = !showFavorites || screenplay.isFavorite;
      return matchesSearch && matchesFavorites;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filteredProjects = projects
    .filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenSettings={() => {
          setCommandPaletteOpen(false);
          setSettingsOpen(true);
        }}
      />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TemplateSelector
        isOpen={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
      />
      <NewProjectDialog
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={handleProjectCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'screenplay' ? 'Screenplay' : 'Project'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'project'
                ? 'Are you sure? Screenplays in this project will become standalone. This action cannot be undone.'
                : 'Are you sure you want to delete this screenplay? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <PageLayout className="pb-20 md:pb-0">
          {/* Pending Invites */}
          <PendingInviteBanner />
          <PendingProjectRoleInviteBanner />

          {/* Page Title and Actions */}
          <div className="mb-4 sm:mb-6 md:mb-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2 break-words">
                  {greeting.text}
                  {greeting.showName && greeting.name && <span className="italic font-normal">, {greeting.name}</span>}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} &middot; {screenplays.length} screenplay{screenplays.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button onClick={createNewProject} variant="outline" size="sm" className="touch-manipulation">
                  <RiFolder6Line className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">New Project</span>
                </Button>
                <Button onClick={createNewScreenplay} size="sm" className="touch-manipulation">
                  <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">New Screenplay</span>
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            {dashboardStats && (
              <StatsCards
                screenplayCount={dashboardStats.screenplayCount}
                projectCount={dashboardStats.projectCount}
                wordsThisWeek={dashboardStats.wordsThisWeek}
                currentStreak={dashboardStats.currentStreak}
              />
            )}

            {/* Tabs, Search, and Filters */}
            <ListPageToolbar
              tabs={{
                items: [
                  { value: 'screenplays', label: 'Screenplays', icon: <PiFilmScript className="h-4 w-4" />, count: filteredScreenplays.length },
                  { value: 'projects', label: 'Projects', icon: <RiFolder6Line className="h-4 w-4" />, count: filteredProjects.length },
                ],
                value: activeTab,
                onChange: (v) => setActiveTab(v as TabValue),
              }}
              search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: `Search ${activeTab}...`,
              }}
              filters={
                activeTab === 'screenplays' ? (
                  <FilterPill
                    active={showFavorites}
                    onClick={() => setShowFavorites(!showFavorites)}
                    icon={<Star className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />}
                    label="Favorites"
                    activeColor="yellow"
                  />
                ) : undefined
              }
            />
          </div>

          {/* Content Grid - key prop triggers animation on tab change */}
          <div key={activeTab} className="animate-tab-content-in">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {activeTab === 'screenplays' ? (
                [1, 2, 3].map((i) => <ScreenplayListCardSkeleton key={i} />)
              ) : (
                [1, 2, 3].map((i) => <ProjectFolderCardSkeleton key={i} />)
              )}
            </div>
          ) : activeTab === 'screenplays' ? (
            // Screenplays Grid
            filteredScreenplays.length === 0 ? (
              <EmptyState
                icon={<PiFilmScript className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />}
                title={searchQuery ? 'No screenplays found' : 'No screenplays yet'}
                description={searchQuery ? 'Try a different search term' : 'Create your first screenplay and bring your stories to life'}
                action={!searchQuery ? {
                  label: 'Create Screenplay',
                  onClick: createNewScreenplay,
                  icon: <Plus className="h-4 w-4 sm:h-5 sm:w-5" />,
                } : undefined}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {/* Import Drop Zone Card - Hidden on mobile */}
                <div className="hidden sm:block">
                  <ImportDropZoneCard
                    context="dashboard"
                    onImportComplete={handleImportComplete}
                    onImportError={(error) => console.error('Import error:', error)}
                  />
                </div>
                {filteredScreenplays.map((screenplay) => (
                  <ScreenplayListCard
                    key={screenplay.id}
                    screenplay={{
                      id: screenplay.id,
                      title: screenplay.title,
                      logline: screenplay.logline,
                      synopsis: screenplay.synopsis,
                      updatedAt: screenplay.updatedAt,
                      wordCount: screenplay.wordCount,
                      genre: screenplay.genre,
                      isFavorite: screenplay.isFavorite,
                      project: screenplay.project,
                      author: screenplay.author,
                      user: screenplay.user,
                    }}
                    href={`/editor/${screenplay.id}`}
                    showFavorite={true}
                    showGenre={true}
                    showProject={true}
                    showWordCount={true}
                    onEdit={() => router.push(`/editor/${screenplay.id}`)}
                    onExport={() => exportScreenplay(screenplay)}
                    onDelete={() => deleteItem(screenplay.id, 'screenplay')}
                  />
                ))}
              </div>
            )
          ) : (
            // Projects Grid
            filteredProjects.length === 0 ? (
              <EmptyState
                icon={<RiFolder6Line className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />}
                title={searchQuery ? 'No projects found' : 'No projects yet'}
                description={searchQuery ? 'Try a different search term' : 'Create a project to organize your screenplays, notes, schedules, and budgets'}
                action={!searchQuery ? {
                  label: 'Create Project',
                  onClick: createNewProject,
                  icon: <Plus className="h-4 w-4 sm:h-5 sm:w-5" />,
                } : undefined}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {filteredProjects.map((project) => (
                  <ProjectFolderCard
                    key={project.id}
                    project={{
                      id: project.id,
                      name: project.name,
                      description: project.description,
                      updatedAt: project.updatedAt,
                      roles: project.roles,
                      screenplays: project.screenplays,
                      _count: project._count,
                    }}
                    onDelete={() => deleteItem(project.id, 'project')}
                    onOpen={() => router.push(`/project/${project.id}`)}
                  />
                ))}
              </div>
            )
          )}
          </div>

          {/* Quick Tips - Hidden on mobile to save space */}
          <div className="mt-8 sm:mt-12 rounded-xl border border-border bg-card p-4 sm:p-6 hidden md:block">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Pro Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">&bull;</span>
                    <span>Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Cmd+K</kbd> to open the command palette</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">&bull;</span>
                    <span>Create a <strong>Project</strong> to organize related screenplays, notes, schedules, and budgets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">&bull;</span>
                    <span>Standalone screenplays can be moved into projects later</span>
                  </li>
                </ul>
            </div>
          </div>
      </PageLayout>
    </>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-pulse">Loading...</div></div>}>
      <WorkspacePageContent />
    </Suspense>
  );
}
