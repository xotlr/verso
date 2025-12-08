'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { SettingsPanel } from '@/components/settings-panel';
import { CommandPalette } from '@/components/command-palette';
import { TemplateSelector } from '@/components/template-selector';
import { NewProjectDialog } from '@/components/new-project-dialog';
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
import { ListPageToolbar, FilterPill } from '@/components/ui/list-page-toolbar';
import { Star } from 'lucide-react';
import { PiFilmScript } from 'react-icons/pi';
import { RiFolder6Line } from 'react-icons/ri';
import { PendingInviteBanner } from '@/components/pending-invite-banner';
import { PendingProjectRoleInviteBanner } from '@/components/pending-project-role-invite-banner';
import { StatsCards } from '@/components/dashboard';
import { PageLayout } from '@/components/layouts/page-layout';
import { ImportResult } from '@/components/import-drop-zone';

import { useGreeting } from '@/hooks/use-greeting';
import { useWorkspaceData, type ProjectItem, type ScreenplayItem } from '@/hooks/use-workspace-data';
import { WorkspaceHeader, WorkspaceContentGrid, type TabValue } from '@/components/workspace';

function WorkspacePageContent() {
  const router = useRouter();
  const { data: session } = useSession();

  // Data management via custom hook
  const {
    screenplays,
    projects,
    dashboardStats,
    isLoading,
    loadData,
    deleteItem,
  } = useWorkspaceData();

  // Contextual greeting via custom hook
  const greeting = useGreeting({
    userName: session?.user?.name,
    screenplayCount: screenplays.length,
    wordsThisWeek: dashboardStats?.wordsThisWeek || 0,
    wordsToday: dashboardStats?.wordsToday || 0,
    totalWordsAllTime: dashboardStats?.totalWordsAllTime || 0,
    lastEditedGenre: dashboardStats?.lastEditedGenre || null,
    currentStreak: dashboardStats?.currentStreak || 0,
    longestStreak: dashboardStats?.longestStreak || 0,
    dailyGoal: dashboardStats?.dailyGoal || 500,
    lastWriteDate: dashboardStats?.lastWriteDate || null,
    recentGreetings: dashboardStats?.recentGreetings || [],
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'screenplay' | 'project';
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('screenplays');
  const [showFavorites, setShowFavorites] = useState(false);

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

  // Handlers
  const createNewScreenplay = () => {
    setTemplateSelectorOpen(true);
  };

  const createNewProject = () => {
    setNewProjectOpen(true);
  };

  const handleProjectCreated = (project: ProjectItem) => {
    loadData();
    setNewProjectOpen(false);
    router.push(`/project/${project.id}`);
  };

  const handleDelete = (id: string, type: 'screenplay' | 'project') => {
    setDeleteTarget({ id, type });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteItem(deleteTarget.id, deleteTarget.type);
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

  // Filter counts for toolbar
  const filteredScreenplayCount = screenplays.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorites = !showFavorites || s.isFavorite;
    return matchesSearch && matchesFavorites;
  }).length;

  const filteredProjectCount = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  ).length;

  return (
    <>
      {/* Dialogs */}
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
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
          <WorkspaceHeader
            greeting={greeting}
            projectCount={projects.length}
            screenplayCount={screenplays.length}
            onCreateProject={createNewProject}
            onCreateScreenplay={createNewScreenplay}
          />

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
                {
                  value: 'screenplays',
                  label: 'Screenplays',
                  icon: <PiFilmScript className="h-4 w-4" />,
                  count: filteredScreenplayCount,
                },
                {
                  value: 'projects',
                  label: 'Projects',
                  icon: <RiFolder6Line className="h-4 w-4" />,
                  count: filteredProjectCount,
                },
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
                  icon={
                    <Star
                      className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`}
                    />
                  }
                  label="Favorites"
                  activeColor="yellow"
                />
              ) : undefined
            }
          />
        </div>

        {/* Content Grid */}
        <div key={activeTab} className="animate-tab-content-in">
          <WorkspaceContentGrid
            activeTab={activeTab}
            isLoading={isLoading}
            screenplays={screenplays}
            projects={projects}
            searchQuery={searchQuery}
            showFavorites={showFavorites}
            onDelete={handleDelete}
            onExport={exportScreenplay}
            onImportComplete={handleImportComplete}
            onCreateScreenplay={createNewScreenplay}
            onCreateProject={createNewProject}
          />
        </div>

        {/* Quick Tips - Hidden on mobile to save space */}
        <div className="mt-8 sm:mt-12 rounded-xl border border-border bg-card p-4 sm:p-6 hidden md:block">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">
              Pro Tips
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&bull;</span>
                <span>
                  Press{' '}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    Cmd+K
                  </kbd>{' '}
                  to open the command palette
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&bull;</span>
                <span>
                  Create a <strong>Project</strong> to organize related screenplays,
                  notes, schedules, and budgets
                </span>
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
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <WorkspacePageContent />
    </Suspense>
  );
}
