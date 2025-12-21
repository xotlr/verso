'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Link as LinkIcon, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

interface Resource {
  id: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
}

interface SeriesResourcesTabProps {
  seriesId: string;
  resources?: Resource[];
  onAddResource?: (resource: Omit<Resource, 'id'>) => void;
  onDeleteResource?: (id: string) => void;
}

export function SeriesResourcesTab({
  seriesId: _seriesId,
  resources = [],
  onAddResource,
  onDeleteResource,
}: SeriesResourcesTabProps) {
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    description: '',
  });

  const handleAddResource = () => {
    if (!newResource.title.trim() || !newResource.url.trim()) return;

    onAddResource?.({
      title: newResource.title.trim(),
      url: newResource.url.trim(),
      description: newResource.description.trim() || undefined,
    });

    setNewResource({ title: '', url: '', description: '' });
    setIsAddingResource(false);
  };

  // Extract domain from URL for display
  const getDomain = (url: string): string => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resources</h3>
          <p className="text-sm text-muted-foreground">
            Links to reference materials, research, mood boards, and more.
          </p>
        </div>
        <Button onClick={() => setIsAddingResource(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Link
        </Button>
      </div>

      {/* Resources Grid or Empty State */}
      {resources.length === 0 ? (
        <Empty border>
          <EmptyMedia variant="icon">
            <LinkIcon className="h-6 w-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No resources yet</EmptyTitle>
            <EmptyDescription>Add links to reference materials, research, and inspiration.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setIsAddingResource(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map(resource => (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                      {resource.title}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {getDomain(resource.url)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={e => {
                          e.preventDefault();
                          onDeleteResource?.(resource.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {resource.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {resource.description}
                </p>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Add Resource Dialog */}
      <Dialog open={isAddingResource} onOpenChange={setIsAddingResource}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="resource-title">Title</Label>
              <Input
                id="resource-title"
                placeholder="Resource title"
                value={newResource.title}
                onChange={e =>
                  setNewResource(prev => ({ ...prev, title: e.target.value }))
                }
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-url">URL</Label>
              <Input
                id="resource-url"
                placeholder="https://..."
                type="url"
                value={newResource.url}
                onChange={e =>
                  setNewResource(prev => ({ ...prev, url: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-desc">Description (optional)</Label>
              <Textarea
                id="resource-desc"
                placeholder="Brief description of this resource..."
                value={newResource.description}
                onChange={e =>
                  setNewResource(prev => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsAddingResource(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddResource}
                disabled={!newResource.title.trim() || !newResource.url.trim()}
              >
                Add Resource
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
