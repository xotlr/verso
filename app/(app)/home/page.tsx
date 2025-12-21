'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { SettingsPanel } from '@/components/settings-panel';
import { CommandPalette } from '@/components/command-palette';
import { TemplateSelector } from '@/components/template-selector';
import { NewProjectDialog } from '@/components/project/new-project-dialog';
import { MoveToProjectDialog } from '@/components/move-to-project-dialog';
import { toast } from 'sonner';
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
import { PiFilmScript, PiFilmScriptFill } from 'react-icons/pi';
import { RiFolder6Line, RiFolder6Fill, RiStackLine, RiStackFill } from 'react-icons/ri';
import { CreateSeriesDialog } from '@/components/series/create-series-dialog';
import { PendingInviteBanner } from '@/components/pending-invite-banner';
import { PendingProjectRoleInviteBanner } from '@/components/pending-project-role-invite-banner';
import { PageLayout } from '@/components/layouts/page-layout';
import { ImportResult, ImportDropZoneOverlay, useFileImport } from '@/components/import-drop-zone';

import { useGreeting } from '@/hooks/use-greeting';
import { useWorkspaceData, type ProjectItem, type ScreenplayItem } from '@/hooks/use-workspace-data';
import { useStackOperations } from '@/hooks/use-stack-operations';
import { WorkspaceHeader, WorkspaceContentGrid, type TabValue } from '@/components/workspace';
import { useViewMode } from '@/hooks/use-view-mode';

function WorkspacePageContent() {
  const router = useRouter();
  const { data: session } = useSession();

  // Data management via custom hook
  const {
    screenplays,
    projects,
    series,
    stacks,
    dashboardStats,
    isLoading,
    loadData,
    deleteItem,
    setScreenplays,
    setStacks,
  } = useWorkspaceData();

  // Stack operations (drag-to-stack functionality)
  const {
    createStackFromDrop,
    addToStack,
    dissolveStack,
    renameStack,
    removeFromStack,
  } = useStackOperations({
    screenplays,
    stacks,
    setScreenplays,
    setStacks,
    loadData,
  });

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
    recentCategories: dashboardStats?.recentCategories || [],
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newSeriesOpen, setNewSeriesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'screenplay' | 'project' | 'series' | 'stack';
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('screenplays');
  const [showFavorites, setShowFavorites] = useState(false);
  const [moveTarget, setMoveTarget] = useState<ScreenplayItem | null>(null);
  const [viewMode, setViewMode] = useViewMode('home');

  // File import hook for the Import button
  const { importFile } = useFileImport({
    onSuccess: (result) => handleImportComplete(result),
    onError: (error) => toast.error(error),
  });

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

  const createNewSeries = () => {
    setNewSeriesOpen(true);
  };

  const handleProjectCreated = (project: ProjectItem) => {
    loadData();
    setNewProjectOpen(false);
    router.push(`/project/${project.id}`);
  };

  const handleDelete = (id: string, type: 'screenplay' | 'project' | 'series' | 'stack') => {
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

  const createProjectFromScreenplay = async (screenplay: ScreenplayItem) => {
    try {
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: screenplay.title,
          description: screenplay.synopsis || screenplay.logline || null,
        }),
      });

      if (!projectResponse.ok) {
        const data = await projectResponse.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await projectResponse.json();

      const moveResponse = await fetch(`/api/screenplays/${screenplay.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!moveResponse.ok) {
        throw new Error('Failed to add screenplay to project');
      }

      toast.success('Project created');
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
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
        const data = await response.json();
        throw new Error(data.error || 'Failed to create screenplay');
      }

      const screenplay = await response.json();
      toast.success('Screenplay imported');
      router.push(`/editor/${screenplay.id}`);
    } catch (error) {
      console.error('Error importing screenplay:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import screenplay');
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

  const filteredSeriesCount = series.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.logline?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  ).length;

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
      <CreateSeriesDialog
        open={newSeriesOpen}
        onOpenChange={setNewSeriesOpen}
        onSuccess={loadData}
      />

      {/* Drag-drop import overlay */}
      <ImportDropZoneOverlay
        enabled={true}
        onImportComplete={handleImportComplete}
        onImportError={(error) => toast.error(error)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'screenplay' ? 'Screenplay' : deleteTarget?.type === 'series' ? 'Series' : deleteTarget?.type === 'stack' ? 'Stack' : 'Project'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'project'
                ? 'Are you sure? Screenplays in this project will become standalone. This action cannot be undone.'
                : deleteTarget?.type === 'series'
                ? 'Are you sure? Episodes in this series will become standalone screenplays. This action cannot be undone.'
                : deleteTarget?.type === 'stack'
                ? 'Are you sure? Screenplays in this stack will become standalone. This action cannot be undone.'
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

      {/* Move to Project Dialog */}
      {moveTarget && (
        <MoveToProjectDialog
          open={!!moveTarget}
          onOpenChange={(open) => !open && setMoveTarget(null)}
          screenplayId={moveTarget.id}
          screenplayTitle={moveTarget.title}
          currentProjectId={moveTarget.project?.id}
          onSuccess={loadData}
        />
      )}

      {/* Main Content */}
      <PageLayout>
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
            onImportFile={importFile}
          />

          {/* Tabs, Search, and Filters */}
          <ListPageToolbar
            tabs={{
              items: [
                {
                  value: 'screenplays',
                  label: 'Screenplays',
                  icon: <PiFilmScript className="h-4 w-4" />,
                  activeIcon: <PiFilmScriptFill className="h-4 w-4" />,
                  count: filteredScreenplayCount,
                },
                {
                  value: 'series',
                  label: 'Series',
                  icon: <RiStackLine className="h-4 w-4" />,
                  activeIcon: <RiStackFill className="h-4 w-4" />,
                  count: filteredSeriesCount,
                },
                {
                  value: 'projects',
                  label: 'Projects',
                  icon: <RiFolder6Line className="h-4 w-4" />,
                  activeIcon: <RiFolder6Fill className="h-4 w-4" />,
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
            viewMode={{
              value: viewMode,
              onChange: setViewMode,
            }}
          />
        </div>

        {/* Content Grid */}
        <div key={activeTab} className="animate-tab-content-in">
          <WorkspaceContentGrid
            activeTab={activeTab}
            isLoading={isLoading}
            screenplays={screenplays}
            projects={projects}
            series={series}
            stacks={stacks}
            searchQuery={searchQuery}
            showFavorites={showFavorites}
            viewMode={viewMode}
            onDelete={handleDelete}
            onExport={exportScreenplay}
            onImportComplete={handleImportComplete}
            onCreateScreenplay={createNewScreenplay}
            onCreateProject={createNewProject}
            onCreateSeries={createNewSeries}
            onMoveToProject={(screenplay) => setMoveTarget(screenplay)}
            onCreateProjectFromScreenplay={createProjectFromScreenplay}
            onCreateStack={createStackFromDrop}
            onAddToStack={addToStack}
            onDissolveStack={dissolveStack}
            onRenameStack={renameStack}
            onRemoveFromStack={removeFromStack}
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
