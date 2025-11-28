'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

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

// Holiday-specific greetings
function getHolidayGreetings(month: number, day: number): string[] | null {
  // New Year's (Jan 1-3)
  if (month === 0 && day <= 3) return [
    "Happy New Year", "New year, new screenplay", "Fresh start energy",
    "Time to write your best year yet"
  ];
  // Valentine's Day (Feb 14)
  if (month === 1 && day === 14) return [
    "Write something romantic today", "Happy Valentine's Day",
    "Love stories start here"
  ];
  // St. Patrick's Day (Mar 17)
  if (month === 2 && day === 17) return [
    "Feeling lucky", "May your dialogue be golden"
  ];
  // April Fools (Apr 1)
  if (month === 3 && day === 1) return [
    "No joke, time to write", "Plot twist ahead"
  ];
  // Independence Day (Jul 4)
  if (month === 6 && day === 4) return [
    "Happy 4th", "Declare your creative independence"
  ];
  // Halloween (Oct 25-31)
  if (month === 9 && day >= 25) return [
    "Spooky screenplay season", "Write something scary",
    "The horror draft awaits", "Frighteningly good writing weather"
  ];
  // Thanksgiving (Nov 22-28)
  if (month === 10 && day >= 22 && day <= 28) return [
    "Grateful for stories", "Write what you're thankful for"
  ];
  // Christmas season (Dec 15-25)
  if (month === 11 && day >= 15 && day <= 25) return [
    "Happy holidays", "Tis the season to write",
    "Holiday magic on the page", "The gift of storytelling"
  ];
  // New Year's Eve (Dec 31)
  if (month === 11 && day === 31) return [
    "Last writes of the year", "Finish the year strong",
    "One more scene before midnight"
  ];
  // Award Season (Feb-Mar)
  if (month === 1 || month === 2) return [
    "Oscar season inspiration", "Award-worthy writing awaits",
    "And the award goes to"
  ];
  return null;
}

// Playful, creative greetings based on time, day, season, activity, and holidays
function getGreeting(userName?: string | null, screenplayCount?: number): { text: string; showName: boolean; name?: string } {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const firstName = userName?.split(' ')[0];

  // Time-based greetings (fixed boundaries: night = 9PM-5AM)
  const timeGreetings: Record<string, string[]> = {
    morning: [
      "Rise and write",
      "Morning muse reporting for duty",
      "Coffee's ready, screenplay's waiting",
      "Dawn of a new scene",
      "The early bird writes the script",
      "Fresh morning, fresh pages",
      "Sunrise storytelling",
      "Good morning, wordsmith",
      "Good morning",
      "Time to caffeinate and create",
      "The morning draft awaits",
      "Bright ideas for a bright morning",
      "Morning pages",
    ],
    afternoon: [
      "Afternoon plot twist incoming",
      "The afternoon writing window is open",
      "Prime writing hours activated",
      "Post-lunch creativity surge",
      "Afternoon act two",
      "The mid-day muse strikes",
      "Dialogue time",
      "Afternoon inspiration loading",
      "Good afternoon",
      "Peak creativity hours",
      "The afternoon shift",
      "Midday momentum",
    ],
    evening: [
      "Evening pages await",
      "Golden hour for golden dialogue",
      "The evening draft calls",
      "Evening writing ritual",
      "Twilight tales",
      "Wind down with words",
      "The quiet hours begin",
      "Dusk to draft",
      "Good evening",
      "Sunset scripting",
      "Evening edit time",
      "The evening muse awakens",
    ],
    night: [
      "Burning the midnight oil",
      "Night owl mode: engaged",
      "The muse works late tonight",
      "Moonlit manuscript time",
      "The witching hour of creativity",
      "Late night legends are written now",
      "Quiet hours, loud ideas",
      "The night shift begins",
      "Stars out, scripts out",
      "Midnight magic",
      "The world sleeps, writers create",
      "Night writer",
      "After hours creativity",
    ],
  };

  // Day-based greetings
  const daySpecial: Record<number, string[]> = {
    0: ["Sunday story time", "Weekend writing vibes", "Lazy Sunday, busy pen", "Sunday screenplay brunch", "Sunday scripting"],
    1: ["Monday momentum", "New week, new scenes", "Monday motivation", "Fresh start energy", "Monday magic"],
    2: ["Tuesday tales", "Second day surge", "Two days in, keep going", "Tuesday productivity"],
    3: ["Midweek magic", "Wednesday words", "Hump day hustle", "Halfway there", "Wednesday writing"],
    4: ["Thursday thoughts", "Almost Friday focus", "Thursday momentum", "Thursday thunder"],
    5: ["Friday finale energy", "Friday flow state", "Friday focus", "End the week strong"],
    6: ["Saturday sprint", "Weekend creative mode", "Saturday scripting", "No deadlines, just passion"],
  };

  // Season-based greetings
  const getSeason = (m: number) => m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "fall" : "winter";
  const seasonGreetings: Record<string, string[]> = {
    spring: ["Spring into your story", "Fresh season, fresh pages", "Bloom where you write", "Spring creativity"],
    summer: ["Summer blockbuster in the making", "Hot takes, hotter scripts", "Beach reads start here", "Summer screenplay season"],
    fall: ["Fall into your narrative", "Sweater weather, screenplay weather", "Autumn acts", "Crisp air, crisp dialogue"],
    winter: ["Cozy writing weather", "Winter drafts (the good kind)", "Hibernation mode: write", "Snowbound and story-bound", "Warm drink, warm story"],
  };

  // Activity-based greetings (tiered by screenplay count)
  const getActivityGreetings = (count: number = 0): string[] => {
    if (count === 0) return [
      "Your blank page awaits",
      "Every great writer started here",
      "Chapter one begins now",
      "The cursor blinks with possibility",
      "Your first masterpiece awaits",
    ];
    if (count <= 4) return [
      "Back for more",
      "The plot thickens",
      "Let's pick up where we left off",
      "Time to add another page",
      "Building momentum",
    ];
    if (count <= 9) return [
      "The prolific writer returns",
      "Another day, another scene",
      "Your portfolio grows",
      "Unstoppable",
      "On a roll",
    ];
    return [
      "The veteran returns",
      "Master at work",
      "Your empire of words",
      "Legend status",
      "The writing machine",
    ];
  };

  // Generic fallbacks
  const genericGreetings = [
    "The blank page fears you",
    "Write something brilliant",
    "Every word counts",
    "Make it memorable",
    "The cursor is ready",
    "Let the words flow",
    "Create something great",
    "Words await",
    "Story time",
    "Let's write",
  ];

  // Determine time period (fixed: 0-4 AM is night, not morning)
  const timePeriod =
    (hour >= 5 && hour < 12) ? "morning" :
    (hour >= 12 && hour < 17) ? "afternoon" :
    (hour >= 17 && hour < 21) ? "evening" :
    "night"; // 21-23 and 0-4

  // Check for holiday greetings first (they get priority)
  const holidayGreetings = getHolidayGreetings(month, dayOfMonth);

  // Build pool of options
  const pool = [
    ...timeGreetings[timePeriod],
    ...daySpecial[day],
    ...seasonGreetings[getSeason(month)],
    ...getActivityGreetings(screenplayCount),
    ...genericGreetings,
    ...(holidayGreetings || []),
  ];

  // Pick from pool (seeded by minute so it doesn't flicker on re-render)
  const minuteSeed = Math.floor(Date.now() / 60000);
  const greeting = pool[minuteSeed % pool.length];

  return {
    text: greeting,
    showName: shouldShowName(greeting),
    name: firstName || undefined,
  };
}
import { SettingsPanel } from '@/components/settings-panel';
import { CommandPalette } from '@/components/command-palette';
import { TemplateSelector } from '@/components/template-selector';
import { NewProjectDialog } from '@/components/new-project-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Template } from '@/types/templates';
import { Skeleton } from '@/components/ui/skeleton';
import { ImportDropZoneCard, ImportResult } from '@/components/import-drop-zone';
import {
  Plus,
  Search,
  FileText,
  Clock,
  MoreHorizontal,
  Trash2,
  Download,
  Edit3,
  ChevronRight,
  FolderOpen,
  Film,
  Folder,
} from 'lucide-react';
import { PendingInviteBanner } from '@/components/pending-invite-banner';

interface ScreenplayItem {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  wordCount: number;
  projectId: string | null;
  project?: { id: string; name: string } | null;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  _count: {
    screenplays: number;
    notes: number;
    schedules: number;
    budgets: number;
  };
}

type TabValue = 'screenplays' | 'projects';

function WorkspacePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [screenplays, setScreenplays] = useState<ScreenplayItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  // Dynamic greeting based on time, day, season, and activity
  const greeting = useMemo(
    () => getGreeting(session?.user?.name, screenplays.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.user?.name, screenplays.length, Math.floor(Date.now() / 60000)]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'screenplay' | 'project' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('screenplays');

  useEffect(() => {
    loadData();
  }, []);

  // Handle ?new=true query parameter
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setTemplateSelectorOpen(true);
      router.replace('/home', { scroll: false });
    }
    if (searchParams.get('newProject') === 'true') {
      setNewProjectOpen(true);
      router.replace('/home', { scroll: false });
    }
  }, [searchParams, router]);

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
      const [screenplaysRes, projectsRes] = await Promise.all([
        fetch('/api/screenplays'),
        fetch('/api/projects'),
      ]);

      if (screenplaysRes.ok) {
        const data = await screenplaysRes.json();
        const items: ScreenplayItem[] = (data.screenplays || []).map((item: ScreenplayItem) => ({
          ...item,
          wordCount: 0, // Content not included in list response for performance
        }));
        setScreenplays(items);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data);
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

  const createFromTemplate = async (template: Template) => {
    try {
      const response = await fetch('/api/screenplays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.name === 'Blank Screenplay' ? 'Untitled Screenplay' : template.name,
          content: template.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create screenplay (${response.status})`);
      }

      const screenplay = await response.json();
      window.location.href = `/editor/${screenplay.id}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create screenplay';
      toast.error(message);
    }
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

  const filteredScreenplays = screenplays.filter(screenplay =>
    screenplay.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    screenplay.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const standaloneScreenplays = filteredScreenplays.filter(s => !s.projectId);

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
        onSelect={createFromTemplate}
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
      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Pending Team Invites */}
          <PendingInviteBanner />

          {/* Page Title and Actions */}
          <div className="mb-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-1">
                  {greeting.text}
                  {greeting.showName && greeting.name && <span className="italic font-normal">, {greeting.name}</span>}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} &middot; {screenplays.length} screenplay{screenplays.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={createNewProject} variant="outline" className="gap-2">
                  <Folder className="h-4 w-4" />
                  New Project
                </Button>
                <Button onClick={createNewScreenplay} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Screenplay
                </Button>
              </div>
            </div>

            {/* Tabs and Search */}
            <div className="flex items-center gap-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                <TabsList>
                  <TabsTrigger value="screenplays" className="gap-2">
                    <Film className="h-4 w-4" />
                    Screenplays
                    <Badge variant="secondary" className="ml-1">{filteredScreenplays.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Projects
                    <Badge variant="secondary" className="ml-1">{filteredProjects.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground placeholder-muted-foreground transition-all"
                />
              </div>
            </div>
          </div>

          {/* Content Grid - key prop triggers animation on tab change */}
          <div key={activeTab} className="animate-tab-content-in">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border/60 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : activeTab === 'screenplays' ? (
            // Screenplays Grid
            filteredScreenplays.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl mb-6">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {searchQuery ? 'No screenplays found' : 'No screenplays yet'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery ? 'Try a different search term' : 'Create your first screenplay and bring your stories to life'}
                </p>
                {!searchQuery && (
                  <Button onClick={createNewScreenplay} className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Screenplay
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Import Drop Zone Card */}
                <ImportDropZoneCard
                  context="dashboard"
                  onImportComplete={handleImportComplete}
                  onImportError={(error) => console.error('Import error:', error)}
                />
                {filteredScreenplays.map((screenplay) => (
                  <div
                    key={screenplay.id}
                    className="group relative bg-card rounded-xl border border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(screenplay.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <Link href={`/editor/${screenplay.id}`}>
                      <div className="p-5 cursor-pointer">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
                              {screenplay.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatDistanceToNow(new Date(screenplay.updatedAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {screenplay.wordCount.toLocaleString()} words
                            </Badge>
                            {screenplay.project ? (
                              <Badge variant="outline" className="text-xs">
                                {screenplay.project.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Standalone
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </Link>

                    {/* Action Menu */}
                    {hoveredCard === screenplay.id && (
                      <div className="absolute top-14 right-4 bg-card border border-border rounded-xl shadow-xl py-1 z-10 min-w-[140px] animate-fade-in">
                        <button
                          onClick={() => window.location.href = `/editor/${screenplay.id}`}
                          className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => exportScreenplay(screenplay)}
                          className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Export
                        </button>
                        <hr className="my-1 border-border" />
                        <button
                          onClick={() => deleteItem(screenplay.id, 'screenplay')}
                          className="w-full px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            // Projects Grid
            filteredProjects.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl mb-6">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery ? 'Try a different search term' : 'Create a project to organize your screenplays, notes, schedules, and budgets'}
                </p>
                {!searchQuery && (
                  <Button onClick={createNewProject} className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative bg-card rounded-xl border border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
                    onMouseEnter={() => setHoveredCard(project.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <Link href={`/project/${project.id}`}>
                      <div className="p-5 cursor-pointer">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="p-1.5 hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                          {project.description || 'No description'}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{project._count.screenplays} screenplay{project._count.screenplays !== 1 ? 's' : ''}</span>
                            <span>&middot;</span>
                            <span>{project._count.notes} note{project._count.notes !== 1 ? 's' : ''}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </Link>

                    {/* Action Menu */}
                    {hoveredCard === project.id && (
                      <div className="absolute top-14 right-4 bg-card border border-border rounded-xl shadow-xl py-1 z-10 min-w-[140px] animate-fade-in">
                        <button
                          onClick={() => window.location.href = `/project/${project.id}`}
                          className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                        >
                          <FolderOpen className="h-4 w-4" />
                          Open
                        </button>
                        <hr className="my-1 border-border" />
                        <button
                          onClick={() => deleteItem(project.id, 'project')}
                          className="w-full px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
          </div>

          {/* Quick Tips */}
          <div className="mt-12 rounded-xl border border-border bg-card p-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Pro Tips</h3>
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
        </div>
      </main>
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
