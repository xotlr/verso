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
import { MoveToTeamDialog } from '@/components/move-to-team-dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { ScreenplayListCard } from '@/components/screenplay/screenplay-list-card';
import {
  PiFilmScript,
  PiFilmScriptFill,
  PiClipboard,
  PiClipboardFill,
} from 'react-icons/pi';
import { IoFileTrayStacked, IoFileTrayStackedOutline } from 'react-icons/io5';
import { FaNoteSticky, FaRegNoteSticky } from 'react-icons/fa6';
import { MdViewTimeline, MdOutlineViewTimeline } from 'react-icons/md';
import { RiCoinsFill, RiCoinsLine } from 'react-icons/ri';
import { HiOutlineUserGroup, HiMiniUserGroup } from 'react-icons/hi2';
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
  Pencil,
} from 'lucide-react';
import { ExternalLinkCard, ExternalLinkData } from '@/components/external-link-card';
import { AddLinkDialog } from '@/components/add-link-dialog';
import { AddExistingScreenplayDialog } from '@/components/add-existing-screenplay-dialog';
import { ProjectRolesManager, type ProjectRole } from '@/components/project/roles';
import { ProjectRoleNeedsManager } from '@/components/project/project-role-needs-manager';
import { RenameProjectDialog } from '@/components/project/rename-project-dialog';
import { useSession } from '@/components/providers/auth-provider';
import type { EmbedType } from '@/lib/export/embed';
import { ImportDropZoneOverlay } from '@/components/import-drop-zone';
import type { ImportResult } from '@/components/import-drop-zone/types';
import { getImportQuipShort } from '@/lib/import-quips';
import { ResourceDropZoneOverlay } from '@/components/resource-drop-zone-overlay';
import { toast } from 'sonner';
import { CallsheetCard, CallsheetCardSkeleton, CallsheetDialog, CallsheetExportDialog } from '@/components/callsheet';
import type { CallsheetCardData, CallsheetCreateInput } from '@/types/callsheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ProGate, ShotChecklist, ProgressDashboard, ProductionEmpty, WrapReportDialog } from '@/components/production';
import type { ProductionProgress } from '@/types/production-tracking';
import { LuClapperboard } from 'react-icons/lu';

type ResourceFilter = 'all' | 'videos' | 'docs' | 'visual' | 'other';

interface Screenplay {
  id: string;
  title: string;
  logline: string | null;
  synopsis: string | null;
  wordCount: number;
  genre: string | null;
  isFavorite: boolean;
  type: 'FILM' | 'TV' | null;
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
  banner: string | null;
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

type TabValue = 'screenplays' | 'notes' | 'schedules' | 'budgets' | 'resources' | 'crew' | 'callsheets' | 'production';

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
  const [teamMoveTarget, setTeamMoveTarget] = useState<Screenplay | null>(null);
  const [externalLinks, setExternalLinks] = useState<ExternalLinkData[]>([]);
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');


  // Callsheets state
  const [callsheets, setCallsheets] = useState<CallsheetCardData[]>([]);
  const [loadingCallsheets, setLoadingCallsheets] = useState(false);
  const [callsheetDialogOpen, setCallsheetDialogOpen] = useState(false);
  const [editingCallsheet, setEditingCallsheet] = useState<CallsheetCardData | null>(null);
  const [exportDialogCallsheet, setExportDialogCallsheet] = useState<{ id: string; title: string } | null>(null);
  const [savingCallsheet, setSavingCallsheet] = useState(false);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  // Load all project data in a single request
  const loadAllData = async () => {
    setIsLoading(true);
    setLoadingCallsheets(true);
    try {
      // Combined endpoint: 3 API calls → 1
      const response = await fetch(`/api/projects/${projectId}/page-data`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/home');
          return;
        }
        throw new Error('Failed to fetch project data');
      }

      const data = await response.json();
      setProject(data.project);
      setExternalLinks(data.links || []);
      setCallsheets(data.callsheets || []);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setIsLoading(false);
      setLoadingCallsheets(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadAllData();
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

  // Individual loaders for after mutations (just reload all data)
  const loadLinks = () => loadAllData();
  const loadCallsheets = () => loadAllData();
  const loadProject = () => loadAllData();

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
      const errorData = await response.json().catch(() => ({}));
      console.error('Add link error:', response.status, errorData);
      throw new Error(errorData.error || 'Failed to add link');
    }

    await loadLinks();
  };

  // Handle URL drop from drag-and-drop
  const handleUrlDrop = async (url: string) => {
    try {
      // Fetch metadata for the URL
      const metadataResponse = await fetch('/api/links/fetch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      let metadata;
      if (metadataResponse.ok) {
        metadata = await metadataResponse.json();
      } else {
        // Fallback to minimal metadata if fetch fails
        metadata = {
          url,
          title: null,
          description: null,
          favicon: null,
          image: null,
          siteName: new URL(url).hostname,
          category: 'other',
        };
      }

      // Add the link to the project
      await addLink(metadata);
      toast.success('Resource added');
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    }
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

  const handleUnlinkScreenplay = async (screenplayId: string) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: null }),
      });

      if (response.ok) {
        toast.success('Screenplay unlinked from project');
        loadProject();
      } else {
        throw new Error('Failed to unlink screenplay');
      }
    } catch (error) {
      console.error('Error unlinking screenplay:', error);
      toast.error('Failed to unlink screenplay');
    }
  };

  const handleExportScreenplay = async (screenplay: Screenplay) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${screenplay.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting screenplay:', error);
      toast.error('Failed to export screenplay');
    }
  };

  const handleToggleFavorite = async (screenplay: Screenplay) => {
    try {
      const response = await fetch(`/api/screenplays/${screenplay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !screenplay.isFavorite }),
      });
      if (response.ok) {
        toast.success(screenplay.isFavorite ? 'Removed from favorites' : 'Added to favorites');
        loadProject();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
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
      toast.success(getImportQuipShort(result.title || screenplay.title));
      loadProject();
      router.push(`/editor/${screenplay.id}`);
    } catch (error) {
      console.error('Error importing screenplay:', error);
      toast.error('Failed to import screenplay');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Banner skeleton */}
        <Skeleton className="h-48 md:h-56 w-full flex-shrink-0" />
        {/* Content skeleton */}
        <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          <Skeleton className="h-5 w-full max-w-2xl mb-3" />
          <Skeleton className="h-4 w-48 mb-6" />
          <Skeleton className="h-10 w-96 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <ScrollArea className="h-full">
      <TemplateSelector
        isOpen={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        projectId={projectId}
      />

      {teamMoveTarget && (
        <MoveToTeamDialog
          open={!!teamMoveTarget}
          onOpenChange={(open) => !open && setTeamMoveTarget(null)}
          screenplayId={teamMoveTarget.id}
          screenplayTitle={teamMoveTarget.title}
          onSuccess={loadProject}
        />
      )}

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

      {project && (
        <RenameProjectDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          projectId={projectId}
          currentName={project.name}
          currentDescription={project.description}
          currentBanner={project.banner}
          userId={session?.user?.id || ''}
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

      {/* Drag-drop URL overlay for resources */}
      <ResourceDropZoneOverlay
        enabled={true}
        onUrlDrop={handleUrlDrop}
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

      {/* Banner */}
      <div className="relative h-48 md:h-56">
        {project.banner ? (
          <img
            src={project.banner}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted/80 to-muted/40" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            variant="glass"
            size="sm"
            onClick={() => router.push('/home')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 inset-x-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{project.name}</h1>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setRenameDialogOpen(true)}
                aria-label="Edit project"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            {/* Status badge */}
            {project.status && (
              <Badge variant="secondary" className="bg-background/50 backdrop-blur-sm">
                <span className={cn('h-2 w-2 rounded-full mr-1.5', STATUS_CONFIG[project.status].color)} />
                {STATUS_CONFIG[project.status].label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Meta info */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                {project.description && (
                  <p className="text-muted-foreground mb-3">{project.description}</p>
                )}
                {/* Team Avatars + Budget */}
                {(() => {
                  // Group roles by userId to show each person once
                  const filledRoles = project.roles.filter(r => r.userId !== null);
                  const groupedByUser = filledRoles.reduce((acc, role) => {
                    const key = role.userId!;
                    if (!acc[key]) {
                      acc[key] = { user: role.user, name: role.name, roles: [] };
                    }
                    acc[key].roles.push(role.role);
                    return acc;
                  }, {} as Record<string, { user: typeof filledRoles[0]['user']; name: string; roles: string[] }>);
                  const uniqueMembers = Object.values(groupedByUser);

                  return (uniqueMembers.length > 0 || project.budget) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                      {/* Stacked Team Avatars */}
                      {uniqueMembers.length > 0 && (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {uniqueMembers.slice(0, 5).map((member, idx) => (
                              <HoverCard key={idx} openDelay={200} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <Avatar className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110">
                                    <AvatarImage src={member.user?.image || undefined} className="object-cover" />
                                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                      {member.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-56 p-3" side="bottom" align="start">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={member.user?.image || undefined} className="object-cover" />
                                      <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                                        {member.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{member.name}</p>
                                      <p className="text-xs text-muted-foreground capitalize">
                                        {member.roles.map(r => r.replace(/_/g, ' ')).join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            ))}
                            {uniqueMembers.length > 5 && (
                              <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                                +{uniqueMembers.length - 5}
                              </div>
                            )}
                          </div>
                          <span className="ml-3 text-sm text-muted-foreground">
                            {uniqueMembers.length} team member{uniqueMembers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    {project.budget && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium text-foreground">{formatBudget(project.budget)}</span>
                      </span>
                    )}
                  </div>
                  );
                })()}
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
              <TabsList className="w-full justify-between sm:w-auto sm:justify-start h-auto inline-flex gap-1 sm:gap-1.5 p-1 sm:p-1.5">
                <TabsTrigger value="screenplays" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  {activeTab === 'screenplays' ? (
                    <PiFilmScriptFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiFilmScript className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">Scripts</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  {activeTab === 'notes' ? (
                    <FaNoteSticky className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <FaRegNoteSticky className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">Notes</span>
                </TabsTrigger>
                <TabsTrigger value="schedules" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  {activeTab === 'schedules' ? (
                    <MdViewTimeline className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <MdOutlineViewTimeline className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
                <TabsTrigger value="budgets" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  {activeTab === 'budgets' ? (
                    <RiCoinsFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <RiCoinsLine className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">Budget</span>
                </TabsTrigger>
                <TabsTrigger value="resources" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  {activeTab === 'resources' ? (
                    <IoFileTrayStacked className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <IoFileTrayStackedOutline className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">Resources</span>
                </TabsTrigger>
                <TabsTrigger value="crew" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  {activeTab === 'crew' ? (
                    <HiMiniUserGroup className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <HiOutlineUserGroup className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">Team</span>
                </TabsTrigger>
                <TabsTrigger value="callsheets" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  {activeTab === 'callsheets' ? (
                    <PiClipboardFill className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <PiClipboard className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline">Callsheets</span>
                </TabsTrigger>
                <TabsTrigger value="production" className="gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 text-sm">
                  <LuClapperboard className={cn("h-4 w-4 flex-shrink-0", activeTab === 'production' && "fill-current")} />
                  <span className="hidden sm:inline">Prod</span>
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
                        logline: screenplay.logline,
                        synopsis: screenplay.synopsis,
                        wordCount: screenplay.wordCount,
                        genre: screenplay.genre,
                        isFavorite: screenplay.isFavorite,
                        type: screenplay.type ?? undefined,
                        updatedAt: screenplay.updatedAt,
                      }}
                      href={`/screenplay/${screenplay.id}`}
                      onEdit={() => router.push(`/screenplay/${screenplay.id}`)}
                      onExport={() => handleExportScreenplay(screenplay)}
                      onToggleFavorite={() => handleToggleFavorite(screenplay)}
                      onDelete={() => setDeleteTarget({ id: screenplay.id, type: 'screenplays' })}
                      onRemoveFromProject={() => handleUnlinkScreenplay(screenplay.id)}
                      onMoveToTeam={() => setTeamMoveTarget(screenplay)}
                      showProject={false}
                      showWordCount={true}
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

            {/* Production Tab */}
            <TabsContent value="production">
              <ProGate feature="Production Tracking">
                <ProductionTabContent
                  screenplays={project.screenplays}
                  callsheets={callsheets}
                />
              </ProGate>
            </TabsContent>
          </Tabs>
      </div>
    </ScrollArea>
  );
}

// Production tab content component
interface Shot {
  id: string;
  sceneId: string;
  shotNumber: number;
  description: string;
  shotType?: string | null;
  cameraAngle?: string | null;
  status: string;
  takeCount: number;
  circledTake?: number | null;
  quickNotes?: string | null;
}

interface SceneInfo {
  id: string;
  heading: string;
  number: number;
}

function ProductionTabContent({
  screenplays,
  callsheets,
}: {
  screenplays: Screenplay[];
  callsheets: CallsheetCardData[];
}) {
  const [selectedScreenplayId, setSelectedScreenplayId] = useState<string | null>(
    screenplays.length > 0 ? screenplays[0].id : null
  );
  const [shots, setShots] = useState<Shot[]>([]);
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [progress, setProgress] = useState<ProductionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [wrapReportOpen, setWrapReportOpen] = useState(false);

  // Fetch shots and progress when screenplay changes
  useEffect(() => {
    if (!selectedScreenplayId) return;

    const fetchProductionData = async () => {
      setIsLoading(true);
      try {
        // Fetch shots
        const shotsRes = await fetch(`/api/screenplays/${selectedScreenplayId}/shots`);
        if (shotsRes.ok) {
          const { shots: fetchedShots } = await shotsRes.json();
          setShots(fetchedShots || []);

          // Extract unique scenes from shots
          const sceneMap = new Map<string, { id: string; heading: string; number: number }>();
          let sceneNum = 1;
          (fetchedShots as Shot[])?.forEach((shot) => {
            if (!sceneMap.has(shot.sceneId)) {
              sceneMap.set(shot.sceneId, {
                id: shot.sceneId,
                heading: `Scene ${sceneNum}`,
                number: sceneNum,
              });
              sceneNum++;
            }
          });
          setScenes(Array.from(sceneMap.values()));
        }

        // Fetch progress
        const progressRes = await fetch(`/api/screenplays/${selectedScreenplayId}/shots/progress`);
        if (progressRes.ok) {
          const { progress: fetchedProgress } = await progressRes.json();
          setProgress(fetchedProgress);
        }
      } catch (error) {
        console.error('Error fetching production data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductionData();
  }, [selectedScreenplayId]);

  if (screenplays.length === 0) {
    return (
      <ProductionEmpty
        title="No screenplays yet"
        description="Create a screenplay first, then add shots to track production progress."
      />
    );
  }

  const selectedScreenplay = screenplays.find((sp) => sp.id === selectedScreenplayId);

  return (
    <div className="space-y-6">
      {/* Header row with selector and wrap report button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Screenplay selector */}
        {screenplays.length > 1 ? (
          <Select
            value={selectedScreenplayId || ''}
            onValueChange={setSelectedScreenplayId}
          >
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select screenplay" />
            </SelectTrigger>
            <SelectContent>
              {screenplays.map((sp) => (
                <SelectItem key={sp.id} value={sp.id}>
                  {sp.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm font-medium">{selectedScreenplay?.title}</div>
        )}

        {/* Wrap Report button */}
        {selectedScreenplayId && shots.some((s) => s.status === 'shot' || s.status === 'approved') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWrapReportOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Wrap Report
          </Button>
        )}
      </div>

      {/* Progress dashboard */}
      <ProgressDashboard
        progress={progress}
        isLoading={isLoading}
        variant="compact"
      />

      {/* Shot checklist */}
      {selectedScreenplayId && (
        <ShotChecklist
          screenplayId={selectedScreenplayId}
          shots={shots}
          scenes={scenes}
          isLoading={isLoading}
          onShotsChange={setShots}
        />
      )}

      {/* Wrap Report Dialog */}
      {selectedScreenplayId && (
        <WrapReportDialog
          open={wrapReportOpen}
          onOpenChange={setWrapReportOpen}
          screenplayId={selectedScreenplayId}
          screenplayTitle={selectedScreenplay?.title || 'Untitled'}
          callsheets={callsheets.map((cs) => ({
            id: cs.id,
            title: cs.title,
            shootDate: cs.shootDate.toString(),
          }))}
        />
      )}
    </div>
  );
}
