'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StandaloneScreenplay {
  id: string;
  title: string;
  updatedAt: string;
  wordCount?: number;
}

interface AddExistingScreenplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onSuccess: () => void;
}

export function AddExistingScreenplayDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onSuccess,
}: AddExistingScreenplayDialogProps) {
  const [screenplays, setScreenplays] = useState<StandaloneScreenplay[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadStandaloneScreenplays();
      setSelectedIds(new Set());
      setSearch('');
    }
  }, [open]);

  const loadStandaloneScreenplays = async () => {
    setIsLoading(true);
    try {
      // Fetch screenplays that don't belong to any project
      const response = await fetch('/api/screenplays?standalone=true');
      if (response.ok) {
        const data = await response.json();
        // API returns { screenplays: [...], total, hasMore }
        setScreenplays(data.screenplays || []);
      }
    } catch (error) {
      console.error('Error loading screenplays:', error);
      toast.error('Failed to load screenplays');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    try {
      // Move each selected screenplay to the project
      const promises = Array.from(selectedIds).map((screenplayId) =>
        fetch(`/api/screenplays/${screenplayId}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every((r) => r.ok);

      if (allSuccessful) {
        toast.success(
          selectedIds.size === 1
            ? 'Screenplay added to project'
            : `${selectedIds.size} screenplays added to project`
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Some screenplays could not be moved');
      }
    } catch (error) {
      console.error('Error moving screenplays:', error);
      toast.error('Failed to add screenplays to project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredScreenplays = screenplays.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Existing Screenplays</DialogTitle>
          <DialogDescription>
            Select screenplays to add to &ldquo;{projectName}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="search-input-icon" />
          <Input
            placeholder="Search screenplays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Screenplay list */}
        <ScrollArea className="h-[300px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="spinner" />
            </div>
          ) : filteredScreenplays.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'No screenplays match your search'
                  : 'No standalone screenplays available'}
              </p>
              {!search && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  All your screenplays are already in projects
                </p>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredScreenplays.map((screenplay) => (
                <div
                  key={screenplay.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSelection(screenplay.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSelection(screenplay.id);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer',
                    selectedIds.has(screenplay.id)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  )}
                >
                  <Checkbox
                    checked={selectedIds.has(screenplay.id)}
                    onCheckedChange={() => toggleSelection(screenplay.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{screenplay.title}</p>
                    {screenplay.wordCount !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {screenplay.wordCount.toLocaleString()} words
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
