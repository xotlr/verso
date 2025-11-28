'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Search,
  Clock,
  MoreHorizontal,
  Trash2,
  ChevronRight,
  FolderOpen,
  Plus,
  Folder,
  Film,
  FileText,
} from 'lucide-react';

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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectCreated = (project: ProjectItem) => {
    setProjects((prev) => [project, ...prev]);
    setNewProjectOpen(false);
    router.push(`/project/${project.id}`);
  };

  const deleteProject = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/projects/${deleteTarget}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== deleteTarget));
        toast.success('Project deleted');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <>
      <NewProjectDialog
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreated={handleProjectCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Screenplays in this project will become standalone. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
                  <Folder className="h-8 w-8" />
                  Projects
                </h1>
                <p className="text-sm text-muted-foreground">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={() => setNewProjectOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground placeholder-muted-foreground transition-all"
              />
            </div>
          </div>

          {/* Content Grid */}
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
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl mb-6">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create a project to organize your screenplays, notes, schedules, and budgets'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setNewProjectOpen(true)} className="gap-2">
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
                          <div className="flex items-center gap-2 mb-1.5">
                            <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                            <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                            </span>
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Film className="h-3.5 w-3.5" />
                            {project._count.screenplays}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {project._count.notes}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>

                  {/* Action Menu */}
                  {hoveredCard === project.id && (
                    <div className="absolute top-14 right-4 bg-card border border-border rounded-xl shadow-xl py-1 z-10 min-w-[140px] animate-fade-in">
                      <button
                        onClick={() => (window.location.href = `/project/${project.id}`)}
                        className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-accent flex items-center gap-2 transition-colors"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Open
                      </button>
                      <hr className="my-1 border-border" />
                      <button
                        onClick={() => setDeleteTarget(project.id)}
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
          )}
        </div>
      </main>
    </>
  );
}
