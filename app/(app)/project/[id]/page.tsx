'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TemplateSelector } from '@/components/template-selector';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { ScreenplayListCard } from '@/components/screenplay/screenplay-list-card';
import {
  PiFilmScript,
  PiFilmScriptFill,
  PiNotePencil,
  PiNotePencilFill,
  PiCalendar,
  PiCalendarFill,
  PiCurrencyDollar,
  PiCurrencyDollarFill,
  PiLink,
  PiLinkFill,
  PiUsers,
  PiUsersFill,
  PiChartBar,
  PiChartBarFill,
  PiClipboard,
  PiClipboardFill,
} from 'react-icons/pi';
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
import {
  ArrowLeft,
  Plus,
  Film,
  FileText,
  Calendar,
  DollarSign,
  Link as LinkIcon,
  Video,
  Image as ImageIcon,
  Grid3X3,
  Clapperboard,
  PenTool,
  BarChart3,
} from 'lucide-react';
import { ExternalLinkCard, ExternalLinkData } from '@/components/external-link-card';
import { AddLinkDialog } from '@/components/add-link-dialog';
import { AddExistingScreenplayDialog } from '@/components/add-existing-screenplay-dialog';
import { ProjectRolesManager, type ProjectRole } from '@/components/project/project-roles-manager';
import { ProjectRoleNeedsManager } from '@/components/project/project-role-needs-manager';
import { useSession } from 'next-auth/react';
import type { EmbedType } from '@/lib/embed-utils';
import { ImportDropZoneOverlay } from '@/components/import-drop-zone';
import type { ImportResult } from '@/components/import-drop-zone/types';
import { toast } from 'sonner';
import { ReportsInlineContent } from '@/components/reports/ReportsInlineContent';
import type { Scene, Character, Location } from '@/types/screenplay';
import { CallsheetCard, CallsheetCardSkeleton, CallsheetDialog, CallsheetExportDialog } from '@/components/callsheet';
import type { CallsheetCardData, CallsheetCreateInput } from '@/types/callsheet';

type ResourceFilter = 'all' | 'videos' | 'docs' | 'visual' | 'other';

interface Screenplay {
  id: string;
  title: string;
  synopsis: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Note {
  id: string;
  title: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Schedule {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

interface Budget {
  id: string;
  title: string;
  total: number;
  createdAt: string;
}

type ProjectStatus = 'DEVELOPMENT' | 'PRE_PRODUCTION' | 'PRODUCTION' | 'POST_PRODUCTION' | 'COMPLETED';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus | null;
  budget: number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  screenplays: Screenplay[];
  notes: Note[];
  schedules: Schedule[];
  budgets: Budget[];
  roles: ProjectRole[];
  _count: {
    screenplays: number;
    notes: number;
    schedules: number;
    budgets: number;
  };
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  DEVELOPMENT: { label: 'Development', color: 'bg-blue-500' },
  PRE_PRODUCTION: { label: 'Pre-Production', color: 'bg-yellow-500' },
  PRODUCTION: { label: 'Production', color: 'bg-green-500' },
  POST_PRODUCTION: { label: 'Post-Production', color: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600' },
};

type TabValue = 'screenplays' | 'notes' | 'schedules' | 'budgets' | 'resources' | 'crew' | 'reports' | 'callsheets';

// Helper to get person name for a role
function getRolePerson(roles: ProjectRole[], roleType: string): string | null {
  const role = roles.find(r => r.role === roleType);
  return role?.name || null;
}

// Format budget for display
function formatBudget(budget: number): string {
  if (budget >= 1_000_000) {
    return `$${(budget / 1_000_000).toFixed(1)}M`;
  }
  if (budget >= 1_000) {
    return `$${(budget / 1_000).toFixed(0)}K`;
  }
  return `$${budget.toLocaleString()}`;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('screenplays');
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [addLinkDialogOpen, setAddLinkDialogOpen] = useState(false);
  const [addExistingDialogOpen, setAddExistingDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: TabValue | 'link' } | null>(null);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkData[]>([]);
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');

  // Reports state
  const [selectedScreenplayForReports, setSelectedScreenplayForReports] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    scenes: Scene[];
    characters: Character[];
    locations: Location[];
  } | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // Callsheets state
  const [callsheets, setCallsheets] = useState<CallsheetCardData[]>([]);
  const [loadingCallsheets, setLoadingCallsheets] = useState(false);
  const [callsheetDialogOpen, setCallsheetDialogOpen] = useState(false);
  const [editingCallsheet, setEditingCallsheet] = useState<CallsheetCardData | null>(null);
  const [exportDialogCallsheet, setExportDialogCallsheet] = useState<{ id: string; title: string } | null>(null);
  const [savingCallsheet, setSavingCallsheet] = useState(false);


  useEffect(() => {
    if (projectId) {
      loadProject();
      loadLinks();
      loadCallsheets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Dispatch project name to header breadcrumb
  useEffect(() => {
    if (project?.name) {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title: project.name }
      }));
    }
  }, [project?.name]);

  const loadLinks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/links`);
      if (response.ok) {
        const data = await response.json();
        setExternalLinks(data);
      }
    } catch (error) {
      console.error('Error loading links:', error);
    }
  };

  const loadCallsheets = async () => {
    setLoadingCallsheets(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/callsheets`);
      if (response.ok) {
        const data = await response.json();
        setCallsheets(data);
      }
    } catch (error) {
      console.error('Error loading callsheets:', error);
    } finally {
      setLoadingCallsheets(false);
    }
  };

  const saveCallsheet = async (data: CallsheetCreateInput) => {
    setSavingCallsheet(true);
    try {
      if (editingCallsheet) {
        // Update existing
        const response = await fetch(`/api/callsheets/${editingCallsheet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          toast.success('Callsheet updated');
          loadCallsheets();
        } else {
          throw new Error('Failed to update callsheet');
        }
      } else {
        // Create new
        const response = await fetch(`/api/projects/${projectId}/callsheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          toast.success('Callsheet created');
          loadCallsheets();
        } else {
          throw new Error('Failed to create callsheet');
        }
      }
      setCallsheetDialogOpen(false);
      setEditingCallsheet(null);
    } catch (error) {
      console.error('Error saving callsheet:', error);
      toast.error('Failed to save callsheet');
    } finally {
      setSavingCallsheet(false);
    }
  };

  const deleteCallsheet = async (id: string) => {
    try {
      const response = await fetch(`/api/callsheets/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Callsheet deleted');
        loadCallsheets();
      }
    } catch (error) {
      console.error('Error deleting callsheet:', error);
      toast.error('Failed to delete callsheet');
    }
  };

  const loadProject = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else if (response.status === 404) {
        router.push('/home');
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        setProject((prev) => prev ? { ...prev, status } : null);
        toast.success('Status updated');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const addLink = async (linkData: Omit<ExternalLinkData, 'id' | 'createdAt'>) => {
    const response = await fetch(`/api/projects/${projectId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkData),
    });

    if (!response.ok) {
      throw new Error('Failed to add link');
    }

    await loadLinks();
  };

  const deleteLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      if (response.ok) {
        setExternalLinks((prev) => prev.filter((link) => link.id !== linkId));
      }
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const updateLinkCategory = async (linkId: string, category: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });

      if (response.ok) {
        setExternalLinks((prev) =>
          prev.map((link) =>
            link.id === linkId ? { ...link, category } : link
          )
        );
      }
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  const updateLinkNotes = async (linkId: string, notes: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        setExternalLinks((prev) =>
          prev.map((link) =>
            link.id === linkId ? { ...link, notes } : link
          )
        );
      }
    } catch (error) {
      console.error('Error updating link notes:', error);
    }
  };

  // Load screenplay data for reports
  const loadReportData = async (screenplayId: string) => {
    setLoadingReports(true);
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/analysis`);
      if (response.ok) {
        const data = await response.json();
        setReportData({
          scenes: data.scenes || [],
          characters: data.characters || [],
          locations: data.locations || [],
        });
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  // Load report data when switching to reports tab or changing screenplay
  useEffect(() => {
    if (activeTab === 'reports' && project?.screenplays.length) {
      const screenplayId = selectedScreenplayForReports || project.screenplays[0]?.id;
      if (screenplayId) {
        setSelectedScreenplayForReports(screenplayId);
        loadReportData(screenplayId);
      }
    }
  }, [activeTab, project?.screenplays, selectedScreenplayForReports]);

  // Filter resources by embed type
  const filteredLinks = externalLinks.filter((link) => {
    if (resourceFilter === 'all') return true;

    const embedType = link.embedType as EmbedType | undefined;

    switch (resourceFilter) {
      case 'videos':
        return embedType === 'youtube' || embedType === 'vimeo';
      case 'docs':
        return embedType === 'google-docs' || embedType === 'google-sheets' || embedType === 'google-slides';
      case 'visual':
        return embedType === 'pinterest' || embedType === 'shotdeck' || embedType === 'canva';
      case 'other':
        return !embedType || embedType === 'generic';
      default:
        return true;
    }
  });

  const deleteItem = async () => {
    if (!deleteTarget) return;

    try {
      let endpoint = '';
      switch (deleteTarget.type) {
        case 'screenplays':
          endpoint = `/api/screenplays/${deleteTarget.id}`;
          break;
        case 'notes':
          endpoint = `/api/notes/${deleteTarget.id}`;
          break;
        case 'schedules':
          endpoint = `/api/schedules/${deleteTarget.id}`;
          break;
        case 'budgets':
          endpoint = `/api/budgets/${deleteTarget.id}`;
          break;
        case 'link':
          await deleteLink(deleteTarget.id);
          setDeleteTarget(null);
          return;
      }

      const response = await fetch(endpoint, { method: 'DELETE' });
      if (response.ok) {
        loadProject();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeleteTarget(null);
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
          projectId: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create screenplay');
      }

      const screenplay = await response.json();
      toast.success('Screenplay imported to project');
      loadProject();
      router.push(`/editor/${screenplay.id}`);
    } catch (error) {
      console.error('Error importing screenplay:', error);
      toast.error('Failed to import screenplay');
    }
  };

  if (isLoading) {
    return (
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <>
      <TemplateSelector
        isOpen={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        projectId={projectId}
      />

      <AddLinkDialog
        isOpen={addLinkDialogOpen}
        onClose={() => setAddLinkDialogOpen(false)}
        onAdd={addLink}
        projectId={projectId}
      />

      {project && (
        <AddExistingScreenplayDialog
          open={addExistingDialogOpen}
          onOpenChange={setAddExistingDialogOpen}
          projectId={projectId}
          projectName={project.name}
          onSuccess={loadProject}
        />
      )}

      {/* Callsheet dialogs */}
      <CallsheetDialog
        open={callsheetDialogOpen}
        onOpenChange={(open) => {
          setCallsheetDialogOpen(open);
          if (!open) setEditingCallsheet(null);
        }}
        callsheet={editingCallsheet as CallsheetCardData | null}
        projectId={projectId}
        onSave={saveCallsheet}
        isSaving={savingCallsheet}
      />

      {exportDialogCallsheet && (
        <CallsheetExportDialog
          open={!!exportDialogCallsheet}
          onOpenChange={(open) => {
            if (!open) setExportDialogCallsheet(null);
          }}
          callsheetId={exportDialogCallsheet.id}
          callsheetTitle={exportDialogCallsheet.title}
        />
      )}

      {/* Drag-drop import overlay */}
      <ImportDropZoneOverlay
        enabled={true}
        onImportComplete={handleImportComplete}
        onImportError={(error) => toast.error(error)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/home')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                </div>
                {project.description && (
                  <p className="text-muted-foreground">{project.description}</p>
                )}
                {/* Director / Writer / Budget */}
                {(getRolePerson(project.roles, 'director') || getRolePerson(project.roles, 'writer') || project.budget) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                    {getRolePerson(project.roles, 'director') && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clapperboard className="h-4 w-4" />
                        <span className="font-medium text-foreground">{getRolePerson(project.roles, 'director')}</span>
                      </span>
                    )}
                    {getRolePerson(project.roles, 'writer') && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <PenTool className="h-4 w-4" />
                        <span className="font-medium text-foreground">{getRolePerson(project.roles, 'writer')}</span>
                      </span>
                    )}
                    {project.budget && (
                      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">{formatBudget(project.budget)}</span>
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{project._count.screenplays} screenplay{project._count.screenplays !== 1 ? 's' : ''}</span>
                  <span>&middot;</span>
                  <span>{project._count.notes} note{project._count.notes !== 1 ? 's' : ''}</span>
                  <span>&middot;</span>
                  <span>Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                <Select
                  value={project.status || 'DEVELOPMENT'}
                  onValueChange={(value) => updateStatus(value as ProjectStatus)}
                >
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'h-2 w-2 rounded-full',
                          STATUS_CONFIG[project.status || 'DEVELOPMENT'].color
                        )} />
                        {STATUS_CONFIG[project.status || 'DEVELOPMENT'].label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', STATUS_CONFIG[status].color)} />
                          {STATUS_CONFIG[status].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <div className="flex flex-col gap-4 mb-6">
              <TabsList className="w-full sm:w-auto h-auto grid grid-cols-3 sm:inline-flex gap-1.5 p-1.5">
                <TabsTrigger value="screenplays" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'screenplays' ? (
                    <PiFilmScriptFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiFilmScript className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Scripts</span>
                  <span className="text-xs opacity-60 ml-auto sm:ml-0">({project._count.screenplays})</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'notes' ? (
                    <PiNotePencilFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiNotePencil className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Notes</span>
                  <span className="text-xs opacity-60 ml-auto sm:ml-0">({project._count.notes})</span>
                </TabsTrigger>
                <TabsTrigger value="schedules" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'schedules' ? (
                    <PiCalendarFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiCalendar className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Schedule</span>
                  <span className="text-xs opacity-60 ml-auto sm:ml-0">({project._count.schedules})</span>
                </TabsTrigger>
                <TabsTrigger value="budgets" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'budgets' ? (
                    <PiCurrencyDollarFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiCurrencyDollar className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Budget</span>
                  <span className="text-xs opacity-60 ml-auto sm:ml-0">({project._count.budgets})</span>
                </TabsTrigger>
                <TabsTrigger value="resources" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'resources' ? (
                    <PiLinkFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiLink className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Links</span>
                  <span className="text-xs opacity-60 ml-auto sm:ml-0">({externalLinks.length})</span>
                </TabsTrigger>
                <TabsTrigger value="crew" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'crew' ? (
                    <PiUsersFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiUsers className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Team</span>
                  <span className="text-xs opacity-60 ml-auto sm:ml-0">({project.roles.length})</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'reports' ? (
                    <PiChartBarFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiChartBar className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Reports</span>
                </TabsTrigger>
                <TabsTrigger value="callsheets" className="gap-2 px-3 py-2.5 text-sm justify-start sm:justify-center">
                  {activeTab === 'callsheets' ? (
                    <PiClipboardFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiClipboard className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>Callsheets</span>
                  <span className="text-xs opacity-60 ml-auto sm:ml-0">({callsheets.length})</span>
                </TabsTrigger>
              </TabsList>

              {activeTab === 'screenplays' && (
                <div className="flex gap-2">
                  <Button onClick={() => setTemplateSelectorOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create New</span>
                  </Button>
                  <Button variant="outline" onClick={() => setAddExistingDialogOpen(true)} className="gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Existing</span>
                  </Button>
                </div>
              )}
              {activeTab === 'resources' && (
                <Button onClick={() => setAddLinkDialogOpen(true)} className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="sm:inline">Add Link</span>
                </Button>
              )}
              {activeTab === 'callsheets' && (
                <Button onClick={() => setCallsheetDialogOpen(true)} className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="sm:inline">New Callsheet</span>
                </Button>
              )}
            </div>

            {/* Screenplays Tab */}
            <TabsContent value="screenplays">
              {project.screenplays.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <Film className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No screenplays yet</EmptyTitle>
                    <EmptyDescription>Add a screenplay to this project</EmptyDescription>
                  </EmptyHeader>
                  <Button onClick={() => setTemplateSelectorOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Screenplay
                  </Button>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {project.screenplays.map((screenplay) => (
                    <ScreenplayListCard
                      key={screenplay.id}
                      screenplay={{
                        id: screenplay.id,
                        title: screenplay.title,
                        synopsis: screenplay.synopsis,
                        updatedAt: screenplay.updatedAt,
                      }}
                      href={`/screenplay/${screenplay.id}`}
                      onEdit={() => router.push(`/screenplay/${screenplay.id}`)}
                      onDelete={() => setDeleteTarget({ id: screenplay.id, type: 'screenplays' })}
                      showProject={false}
                      showType={false}
                      showFavorite={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes">
              {project.notes.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <FileText className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No notes yet</EmptyTitle>
                    <EmptyDescription>Notes feature coming soon</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {project.notes.map((note) => (
                    <div key={note.id} className="bg-card rounded-xl border border-border/60 p-5">
                      <h3 className="font-semibold mb-2">{note.title}</h3>
                      {note.category && (
                        <Badge variant="outline" className="mb-2">{note.category}</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Schedules Tab */}
            <TabsContent value="schedules">
              {project.schedules.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <Calendar className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No schedules yet</EmptyTitle>
                    <EmptyDescription>Scheduling feature coming soon</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {project.schedules.map((schedule) => (
                    <div key={schedule.id} className="bg-card rounded-xl border border-border/60 p-5">
                      <h3 className="font-semibold mb-2">{schedule.title}</h3>
                      <div className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(schedule.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Budgets Tab */}
            <TabsContent value="budgets">
              {project.budgets.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <DollarSign className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No budgets yet</EmptyTitle>
                    <EmptyDescription>Budgeting feature coming soon</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {project.budgets.map((budget) => (
                    <div key={budget.id} className="bg-card rounded-xl border border-border/60 p-5">
                      <h3 className="font-semibold mb-2">{budget.title}</h3>
                      <div className="text-lg font-bold text-primary mb-2">
                        ${budget.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(budget.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources">
              {externalLinks.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <LinkIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No resources yet</EmptyTitle>
                    <EmptyDescription>Add links to Google Docs, research materials, or any external references</EmptyDescription>
                  </EmptyHeader>
                  <Button onClick={() => setAddLinkDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Link
                  </Button>
                </Empty>
              ) : (
                <>
                  {/* Filter buttons */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <Button
                      variant={resourceFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setResourceFilter('all')}
                      className="gap-1.5"
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">All</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {externalLinks.length}
                      </Badge>
                    </Button>
                    <Button
                      variant={resourceFilter === 'videos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setResourceFilter('videos')}
                      className="gap-1.5"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Videos</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {externalLinks.filter(l => l.embedType === 'youtube' || l.embedType === 'vimeo').length}
                      </Badge>
                    </Button>
                    <Button
                      variant={resourceFilter === 'docs' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setResourceFilter('docs')}
                      className="gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Docs</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {externalLinks.filter(l => l.embedType === 'google-docs' || l.embedType === 'google-sheets' || l.embedType === 'google-slides').length}
                      </Badge>
                    </Button>
                    <Button
                      variant={resourceFilter === 'visual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setResourceFilter('visual')}
                      className="gap-1.5"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Visual</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {externalLinks.filter(l => l.embedType === 'pinterest' || l.embedType === 'shotdeck' || l.embedType === 'canva').length}
                      </Badge>
                    </Button>
                    <Button
                      variant={resourceFilter === 'other' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setResourceFilter('other')}
                      className="gap-1.5"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">Other</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {externalLinks.filter(l => !l.embedType || l.embedType === 'generic').length}
                      </Badge>
                    </Button>
                  </div>

                  {filteredLinks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No resources match this filter
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {filteredLinks.map((link) => (
                        <ExternalLinkCard
                          key={link.id}
                          link={link}
                          onDelete={(id) => setDeleteTarget({ id, type: 'link' })}
                          onCategoryChange={updateLinkCategory}
                          onNotesChange={updateLinkNotes}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Crew Tab */}
            <TabsContent value="crew" className="space-y-8">
              <ProjectRolesManager
                projectId={projectId}
                roles={project.roles}
                onRolesChange={(newRoles) => {
                  setProject((prev) => prev ? { ...prev, roles: newRoles } : null);
                }}
              />

              {/* Open Roles / Role Needs */}
              <ProjectRoleNeedsManager
                projectId={projectId}
                isOwner={project.userId === session?.user?.id}
              />
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              {project.screenplays.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <BarChart3 className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No screenplays to analyze</EmptyTitle>
                    <EmptyDescription>Add a screenplay to this project to generate reports</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-6">
                  {/* Screenplay selector if multiple */}
                  {project.screenplays.length > 1 && (
                    <Select
                      value={selectedScreenplayForReports || project.screenplays[0]?.id}
                      onValueChange={(id) => {
                        setSelectedScreenplayForReports(id);
                        loadReportData(id);
                      }}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select screenplay" />
                      </SelectTrigger>
                      <SelectContent>
                        {project.screenplays.map((sp) => (
                          <SelectItem key={sp.id} value={sp.id}>
                            {sp.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Reports content */}
                  {loadingReports ? (
                    <div className="bg-card rounded-lg border border-border/60 p-8">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">Loading report data...</p>
                        </div>
                      </div>
                    </div>
                  ) : reportData ? (
                    <ReportsInlineContent
                      scenes={reportData.scenes}
                      characters={reportData.characters}
                      locations={reportData.locations}
                      screenplayTitle={
                        project.screenplays.find(s => s.id === selectedScreenplayForReports)?.title ||
                        project.screenplays[0]?.title || ''
                      }
                    />
                  ) : (
                    <div className="bg-card rounded-lg border border-border/60 p-8 text-center">
                      <p className="text-muted-foreground">Select a screenplay to view reports</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Callsheets Tab */}
            <TabsContent value="callsheets">
              {loadingCallsheets ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {[1, 2, 3].map((i) => (
                    <CallsheetCardSkeleton key={i} />
                  ))}
                </div>
              ) : callsheets.length === 0 ? (
                <Empty border>
                  <EmptyMedia variant="icon">
                    <PiClipboard className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No callsheets yet</EmptyTitle>
                    <EmptyDescription>Create a callsheet for your shoot days</EmptyDescription>
                  </EmptyHeader>
                  <Button onClick={() => setCallsheetDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Callsheet
                  </Button>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {callsheets.map((callsheet) => (
                    <CallsheetCard
                      key={callsheet.id}
                      callsheet={callsheet}
                      onView={() => setExportDialogCallsheet({ id: callsheet.id, title: callsheet.title })}
                      onEdit={() => {
                        setEditingCallsheet(callsheet);
                        setCallsheetDialogOpen(true);
                      }}
                      onExport={() => setExportDialogCallsheet({ id: callsheet.id, title: callsheet.title })}
                      onDelete={() => deleteCallsheet(callsheet.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </>
  );
}
