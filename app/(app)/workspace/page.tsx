'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { SettingsPanel } from '@/components/settings-panel';
import { CommandPalette } from '@/components/command-palette';
import { TemplateSelector } from '@/components/template-selector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

interface ScreenplayItem {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  wordCount: number;
}

export default function WorkspacePage() {
  const [screenplays, setScreenplays] = useState<ScreenplayItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    loadScreenplays();
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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadScreenplays = () => {
    const items: ScreenplayItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('screenplay_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.title && data.content) {
            items.push({
              id: key.replace('screenplay_', ''),
              title: data.title,
              content: data.content,
              lastModified: data.lastModified || new Date().toISOString(),
              wordCount: data.content.split(/\s+/).filter((word: string) => word.length > 0).length
            });
          }
        } catch (e) {
          console.error('Error loading screenplay:', e);
        }
      }
    }
    items.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    setScreenplays(items);
  };

  const createNewScreenplay = () => {
    setTemplateSelectorOpen(true);
  };

  const createFromTemplate = (template: Template) => {
    const id = Date.now().toString();
    const newScreenplay = {
      title: template.name === 'Blank Screenplay' ? 'Untitled Screenplay' : template.name,
      content: template.content,
      lastModified: new Date().toISOString()
    };

    localStorage.setItem(`screenplay_${id}`, JSON.stringify(newScreenplay));
    window.location.href = `/editor/${id}`;
  };

  const deleteScreenplay = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      localStorage.removeItem(`screenplay_${deleteTarget}`);
      loadScreenplays();
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

  const filteredScreenplays = screenplays.filter(screenplay =>
    screenplay.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    screenplay.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screenplay</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this screenplay? This action cannot be undone.
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
          {/* Page Title and Actions */}
          <div className="mb-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-1">
                  My Screenplays
                </h2>
                <p className="text-sm text-muted-foreground">
                  {screenplays.length} screenplay{screenplays.length !== 1 ? 's' : ''} in your workspace
                </p>
              </div>
              <Button onClick={createNewScreenplay} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Screenplay
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search screenplays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring text-foreground placeholder-muted-foreground transition-all"
              />
            </div>
          </div>

          {/* Screenplays Grid */}
          {filteredScreenplays.length === 0 ? (
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
                            <span>{formatDistanceToNow(new Date(screenplay.lastModified), { addSuffix: true })}</span>
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
                        {screenplay.content.split('\n').find(line => line.trim() && !line.includes('FADE')) || 'No preview available'}
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {screenplay.wordCount.toLocaleString()} words
                        </Badge>
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
                        onClick={() => deleteScreenplay(screenplay.id)}
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

          {/* Quick Tips */}
          <div className="mt-12 rounded-xl border border-border bg-card p-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Pro Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌘K</kbd> to open the command palette</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>AI Analysis can help improve your screenplay structure and dialogue</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Export your screenplay in multiple formats including PDF and Final Draft</span>
                  </li>
                </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
