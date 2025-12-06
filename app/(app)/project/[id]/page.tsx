'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TemplateSelector } from '@/components/template-selector';
import { EmptyState } from '@/components/ui/empty-state';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Plus,
  Film,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit3,
  Link as LinkIcon,
  Video,
  Image,
  Grid3X3,
  Users,
  Clapperboard,
  PenTool,
} from 'lucide-react';
import { ExternalLinkCard, ExternalLinkData } from '@/components/external-link-card';
import { AddLinkDialog } from '@/components/add-link-dialog';
import { AddExistingScreenplayDialog } from '@/components/add-existing-screenplay-dialog';
import { ProjectRolesManager, type ProjectRole } from '@/components/project-roles-manager';
import { ProjectRoleNeedsManager } from '@/components/project-role-needs-manager';
import { useSession } from 'next-auth/react';
import type { EmbedType } from '@/lib/embed-utils';

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

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
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

type TabValue = 'screenplays' | 'notes' | 'schedules' | 'budgets' | 'resources' | 'crew';

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


  useEffect(() => {
    if (projectId) {
      loadProject();
      loadLinks();
    }
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

  if (isLoading) {
    return (
      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>
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

      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/home')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{project.name}</h1>
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
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="screenplays" className="gap-1.5 px-3 py-1.5">
                  <Film className="h-4 w-4" />
                  <span className="hidden sm:inline">Screenplays</span>
                  <Badge variant="secondary" className="text-xs">{project._count.screenplays}</Badge>
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 px-3 py-1.5">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Notes</span>
                  <Badge variant="secondary" className="text-xs">{project._count.notes}</Badge>
                </TabsTrigger>
                <TabsTrigger value="schedules" className="gap-1.5 px-3 py-1.5">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Schedules</span>
                  <Badge variant="secondary" className="text-xs">{project._count.schedules}</Badge>
                </TabsTrigger>
                <TabsTrigger value="budgets" className="gap-1.5 px-3 py-1.5">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Budgets</span>
                  <Badge variant="secondary" className="text-xs">{project._count.budgets}</Badge>
                </TabsTrigger>
                <TabsTrigger value="resources" className="gap-1.5 px-3 py-1.5">
                  <LinkIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Resources</span>
                  <Badge variant="secondary" className="text-xs">{externalLinks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="crew" className="gap-1.5 px-3 py-1.5">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Crew</span>
                  <Badge variant="secondary" className="text-xs">{project.roles.length}</Badge>
                </TabsTrigger>
              </TabsList>

              {activeTab === 'screenplays' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="gap-2 w-full sm:w-auto">
                      <Plus className="h-4 w-4" />
                      <span className="sm:inline">Add Screenplay</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTemplateSelectorOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAddExistingDialogOpen(true)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Add Existing
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {activeTab === 'resources' && (
                <Button onClick={() => setAddLinkDialogOpen(true)} className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="sm:inline">Add Link</span>
                </Button>
              )}
            </div>

            {/* Screenplays Tab */}
            <TabsContent value="screenplays">
              {project.screenplays.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl">
                  <EmptyState
                    icon={<Film className="h-8 w-8 text-muted-foreground" />}
                    title="No screenplays yet"
                    description="Add a screenplay to this project"
                    action={{
                      label: 'Add Screenplay',
                      onClick: () => setTemplateSelectorOpen(true),
                      icon: <Plus className="h-4 w-4" />,
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {project.screenplays.map((screenplay) => (
                    <div
                      key={screenplay.id}
                      className="group relative bg-card rounded-xl border border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
                    >
                      <Link href={`/screenplay/${screenplay.id}`}>
                        <div className="p-5 cursor-pointer">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {screenplay.title}
                            </h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="p-1.5 hover:bg-accent rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/screenplay/${screenplay.id}`)}>
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget({ id: screenplay.id, type: 'screenplays' })}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {screenplay.synopsis || 'No synopsis'}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDistanceToNow(new Date(screenplay.updatedAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes">
              {project.notes.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                  <p className="text-muted-foreground">Notes feature coming soon</p>
                </div>
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
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No schedules yet</h3>
                  <p className="text-muted-foreground">Scheduling feature coming soon</p>
                </div>
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
                <div className="text-center py-16 border border-dashed border-border rounded-xl">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
                  <p className="text-muted-foreground">Budgeting feature coming soon</p>
                </div>
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
                <div className="border border-dashed border-border rounded-xl">
                  <EmptyState
                    icon={<LinkIcon className="h-8 w-8 text-muted-foreground" />}
                    title="No resources yet"
                    description="Add links to Google Docs, research materials, or any external references"
                    action={{
                      label: 'Add Link',
                      onClick: () => setAddLinkDialogOpen(true),
                      icon: <Plus className="h-4 w-4" />,
                    }}
                  />
                </div>
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
                      <Image className="h-3.5 w-3.5" />
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
          </Tabs>
        </div>
      </main>
    </>
  );
}
