'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Search,
  FileText,
  Plus,
  Settings,
  Download,
  Upload,
  Printer,
  Moon,
  Sun,
  Sparkles,
  Type,
  EyeOff,
  Layout,
  ChevronRight,
  Hash,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'formatting' | 'view' | 'settings';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenSettings }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [screenplays, setScreenplays] = useState<Array<{id: string; title: string}>>([]);

  // Load screenplays from API for navigation
  useEffect(() => {
    if (isOpen) {
      fetch('/api/projects')
        .then(res => res.ok ? res.json() : [])
        .then((projects: Array<{ id: string; title: string }>) => {
          setScreenplays(projects.map(p => ({ id: p.id, title: p.title })));
        })
        .catch(() => setScreenplays([]));
    }
  }, [isOpen]);

  const commands: Command[] = useMemo(() => [
    // Navigation
    {
      id: 'new-screenplay',
      label: 'New Screenplay',
      description: 'Create a new screenplay',
      icon: <Plus className="h-4 w-4" />,
      shortcut: 'Cmd+N',
      category: 'navigation',
      keywords: ['create', 'new', 'start'],
      action: async () => {
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Untitled Screenplay',
              content: `FADE IN:\n\nINT. LOCATION - DAY\n\nAction description here...\n\n                              CHARACTER NAME\nDialogue goes here.\n\nFADE OUT.`,
            }),
          });
          if (response.ok) {
            const project = await response.json();
            router.push(`/screenplay/${project.id}`);
          }
        } catch (error) {
          console.error('Error creating screenplay:', error);
        }
        onClose();
      },
    },
    {
      id: 'go-workspace',
      label: 'Go to Workspace',
      description: 'View all screenplays',
      icon: <Layout className="h-4 w-4" />,
      category: 'navigation',
      keywords: ['home', 'library', 'list'],
      action: () => {
        router.push('/home');
        onClose();
      },
    },
    // Actions
    {
      id: 'export',
      label: 'Export Screenplay',
      description: 'Download in various formats',
      icon: <Download className="h-4 w-4" />,
      category: 'actions',
      keywords: ['download', 'save', 'pdf', 'fdx'],
      action: () => {
        onClose();
      },
    },
    {
      id: 'import',
      label: 'Import Screenplay',
      description: 'Load from file',
      icon: <Upload className="h-4 w-4" />,
      category: 'actions',
      keywords: ['load', 'open', 'upload'],
      action: () => {
        onClose();
      },
    },
    {
      id: 'print',
      label: 'Print',
      description: 'Print screenplay',
      icon: <Printer className="h-4 w-4" />,
      shortcut: 'Cmd+P',
      category: 'actions',
      keywords: ['print'],
      action: () => {
        window.print();
        onClose();
      },
    },
    // Formatting
    {
      id: 'insert-scene',
      label: 'Insert Scene Heading',
      icon: <Hash className="h-4 w-4" />,
      shortcut: 'Cmd+Shift+S',
      category: 'formatting',
      keywords: ['scene', 'heading', 'int', 'ext'],
      action: () => {
        onClose();
      },
    },
    {
      id: 'insert-character',
      label: 'Insert Character',
      icon: <Type className="h-4 w-4" />,
      shortcut: 'Cmd+Shift+C',
      category: 'formatting',
      keywords: ['character', 'name'],
      action: () => {
        onClose();
      },
    },
    {
      id: 'insert-dialogue',
      label: 'Insert Dialogue',
      icon: <Type className="h-4 w-4" />,
      shortcut: 'Cmd+Shift+D',
      category: 'formatting',
      keywords: ['dialogue', 'speech'],
      action: () => {
        onClose();
      },
    },
    {
      id: 'ai-analysis',
      label: 'AI Analysis',
      description: 'Analyze screenplay with AI',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'actions',
      keywords: ['ai', 'claude', 'analyze', 'feedback'],
      action: () => {
        onClose();
      },
    },
    // View
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle dark/light theme',
      icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      category: 'view',
      keywords: ['theme', 'dark', 'light', 'mode'],
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        onClose();
      },
    },
    {
      id: 'distraction-free',
      label: 'Toggle Distraction Free',
      description: 'Hide all UI elements',
      icon: <EyeOff className="h-4 w-4" />,
      shortcut: 'Cmd+Shift+F',
      category: 'view',
      keywords: ['distraction', 'focus', 'zen'],
      action: () => {
        onClose();
      },
    },
    // Settings
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Customize your experience',
      icon: <Settings className="h-4 w-4" />,
      shortcut: 'Cmd+,',
      category: 'settings',
      keywords: ['preferences', 'config', 'customize'],
      action: () => {
        onOpenSettings?.();
        onClose();
      },
    },
  ], [theme, setTheme, router, onClose, onOpenSettings]);

  // Add screenplay navigation commands
  const screenplayCommands: Command[] = screenplays.map((sp) => ({
    id: `screenplay-${sp.id}`,
    label: sp.title,
    description: 'Open screenplay',
    icon: <FileText className="h-4 w-4" />,
    category: 'navigation' as const,
    keywords: [sp.title.toLowerCase(), 'open', 'screenplay'],
    action: () => {
      router.push(`/screenplay/${sp.id}`);
      onClose();
    },
  }));

  const allCommands = useMemo(() => [...commands, ...screenplayCommands], [commands, screenplayCommands]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const lowerQuery = query.toLowerCase();
    return allCommands.filter((cmd) => {
      const matchesLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchesDescription = cmd.description?.toLowerCase().includes(lowerQuery);
      const matchesKeywords = cmd.keywords?.some((k) => k.includes(lowerQuery));
      return matchesLabel || matchesDescription || matchesKeywords;
    });
  }, [query, allCommands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  }, [filteredCommands, selectedIndex]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    formatting: 'Formatting',
    view: 'View',
    settings: 'Settings',
  };

  let currentIndex = 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>

        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-base"
          />
          <kbd className="hidden sm:block px-2 py-1 text-xs font-mono bg-muted text-muted-foreground rounded">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No commands found</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => {
              const groupStart = currentIndex;
              currentIndex += cmds.length;

              return (
                <div key={category} className="py-2">
                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {categoryLabels[category]}
                    </h3>
                  </div>
                  {cmds.map((cmd, idx) => {
                    const cmdIndex = groupStart + idx;
                    const isSelected = cmdIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(cmdIndex)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-accent'
                        }`}
                        style={{ width: 'calc(100% - 16px)' }}
                      >
                        <div className={`flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {cmd.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-medium truncate">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="hidden sm:block px-2 py-1 text-xs font-mono bg-muted text-muted-foreground rounded">
                            {cmd.shortcut.replace('Cmd', '⌘')}
                          </kbd>
                        )}
                        {isSelected && (
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredCommands.length} commands
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
