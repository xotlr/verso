'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Hash,
  Clock,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'recent' | 'navigation' | 'actions' | 'formatting' | 'view' | 'settings';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

// Cache for screenplays - persists across palette opens
let screenplayCache: Array<{ id: string; title: string }> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

// Recent commands storage key
const RECENT_COMMANDS_KEY = 'verso-recent-commands';
const MAX_RECENT_COMMANDS = 5;

function getRecentCommands(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(commandId: string) {
  if (typeof window === 'undefined') return;
  // Don't save screenplay navigation to recent (too dynamic)
  if (commandId.startsWith('screenplay-')) return;

  try {
    const recent = getRecentCommands().filter(id => id !== commandId);
    recent.unshift(commandId);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_COMMANDS)));
  } catch {
    // Ignore storage errors
  }
}

export function CommandPalette({ isOpen, onClose, onOpenSettings }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [screenplays, setScreenplays] = useState<Array<{ id: string; title: string }>>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent commands on mount, reset search when closed
  useEffect(() => {
    if (isOpen) {
      setRecentIds(getRecentCommands());
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Load screenplays with caching
  useEffect(() => {
    if (!isOpen) return;

    const now = Date.now();
    if (screenplayCache && (now - cacheTimestamp) < CACHE_DURATION) {
      setScreenplays(screenplayCache);
      return;
    }

    fetch('/api/screenplays')
      .then(res => res.ok ? res.json() : [])
      .then((screenplayList: Array<{ id: string; title: string }>) => {
        const mapped = screenplayList.map(s => ({ id: s.id, title: s.title }));
        screenplayCache = mapped;
        cacheTimestamp = now;
        setScreenplays(mapped);
      })
      .catch(() => setScreenplays([]));
  }, [isOpen]);

  // Execute command and track in recent
  const runCommand = useCallback((commandId: string, action: () => void) => {
    saveRecentCommand(commandId);
    setSearch('');
    action();
  }, []);

  // Base commands (without screenplays)
  const baseCommands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'new-screenplay',
      label: 'New Screenplay',
      description: 'Create a new screenplay',
      icon: <Plus className="h-4 w-4" />,
      shortcut: '⌘N',
      category: 'navigation',
      keywords: ['create', 'new', 'start', 'project'],
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
            // Invalidate cache when new screenplay created
            screenplayCache = null;
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
      keywords: ['home', 'library', 'list', 'projects', 'dashboard'],
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
      keywords: ['download', 'save', 'pdf', 'fdx', 'fountain'],
      action: () => {
        // TODO: Open export dialog
        onClose();
      },
    },
    {
      id: 'import',
      label: 'Import Screenplay',
      description: 'Load from file',
      icon: <Upload className="h-4 w-4" />,
      category: 'actions',
      keywords: ['load', 'open', 'upload', 'fdx', 'fountain'],
      action: () => {
        // TODO: Open import dialog
        onClose();
      },
    },
    {
      id: 'print',
      label: 'Print',
      description: 'Print screenplay',
      icon: <Printer className="h-4 w-4" />,
      shortcut: '⌘P',
      category: 'actions',
      keywords: ['print', 'paper'],
      action: () => {
        window.print();
        onClose();
      },
    },
    {
      id: 'ai-analysis',
      label: 'AI Analysis',
      description: 'Analyze screenplay with AI',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'actions',
      keywords: ['ai', 'claude', 'analyze', 'feedback', 'review'],
      action: () => {
        // TODO: Open AI analysis panel
        onClose();
      },
    },
    // Formatting
    {
      id: 'insert-scene',
      label: 'Insert Scene Heading',
      description: 'INT./EXT. LOCATION - TIME',
      icon: <Hash className="h-4 w-4" />,
      shortcut: '⌘⇧S',
      category: 'formatting',
      keywords: ['scene', 'heading', 'int', 'ext', 'slugline'],
      action: () => {
        // TODO: Dispatch editor event
        onClose();
      },
    },
    {
      id: 'insert-character',
      label: 'Insert Character',
      description: 'Add character name block',
      icon: <Type className="h-4 w-4" />,
      shortcut: '⌘⇧C',
      category: 'formatting',
      keywords: ['character', 'name', 'actor'],
      action: () => {
        // TODO: Dispatch editor event
        onClose();
      },
    },
    {
      id: 'insert-dialogue',
      label: 'Insert Dialogue',
      description: 'Add dialogue block',
      icon: <Type className="h-4 w-4" />,
      shortcut: '⌘⇧D',
      category: 'formatting',
      keywords: ['dialogue', 'speech', 'talk'],
      action: () => {
        // TODO: Dispatch editor event
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
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
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
      shortcut: '⌘⇧F',
      category: 'view',
      keywords: ['distraction', 'focus', 'zen', 'fullscreen'],
      action: () => {
        // TODO: Toggle distraction free mode
        onClose();
      },
    },
    // Settings
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Customize your experience',
      icon: <Settings className="h-4 w-4" />,
      shortcut: '⌘,',
      category: 'settings',
      keywords: ['preferences', 'config', 'customize', 'options'],
      action: () => {
        onOpenSettings?.();
        onClose();
      },
    },
  ], [theme, setTheme, router, onClose, onOpenSettings]);

  // Screenplay navigation commands
  const screenplayCommands: CommandItem[] = useMemo(() =>
    screenplays
      .filter((sp) => sp.title)
      .map((sp) => ({
        id: `screenplay-${sp.id}`,
        label: sp.title,
        description: 'Open screenplay',
        icon: <FileText className="h-4 w-4" />,
        category: 'navigation' as const,
        keywords: [sp.title.toLowerCase(), 'open', 'screenplay', 'project'],
        action: () => {
          router.push(`/screenplay/${sp.id}`);
          onClose();
        },
      })),
    [screenplays, router, onClose]
  );

  // Create a map for quick command lookup
  const commandMap = useMemo(() => {
    const map = new Map<string, CommandItem>();
    [...baseCommands, ...screenplayCommands].forEach(cmd => {
      map.set(cmd.id, cmd);
    });
    return map;
  }, [baseCommands, screenplayCommands]);

  // Recent commands (only show ones that exist)
  const recentCommands: CommandItem[] = useMemo(() =>
    recentIds
      .map(id => commandMap.get(id))
      .filter((cmd): cmd is CommandItem => cmd !== undefined)
      .map(cmd => ({ ...cmd, category: 'recent' as const })),
    [recentIds, commandMap]
  );

  const categoryOrder = ['recent', 'navigation', 'actions', 'formatting', 'view', 'settings'] as const;
  const categoryLabels: Record<string, string> = {
    recent: 'Recent',
    navigation: 'Navigation',
    actions: 'Actions',
    formatting: 'Formatting',
    view: 'View',
    settings: 'Settings',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl p-0 gap-0 overflow-hidden [&>button]:hidden sm:max-h-[85vh] max-h-[100dvh] sm:rounded-lg rounded-none sm:top-[50%] top-0 sm:translate-y-[-50%] translate-y-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>

        <Command className="rounded-lg" loop shouldFilter={true}>
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              autoFocus
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-base py-4"
            />
            <kbd className="hidden sm:block px-2 py-1 text-xs font-mono bg-muted text-muted-foreground rounded">
              ESC
            </kbd>
          </div>

          {/* Commands List */}
          <ScrollArea className="max-h-[60vh] sm:max-h-[50vh]">
            <Command.List>
              <Command.Empty className="p-8 text-center text-muted-foreground">
                No commands found
              </Command.Empty>

            {/* Recent Commands */}
            {recentCommands.length > 0 && (
              <Command.Group heading={
                <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Clock className="h-3 w-3" />
                  {categoryLabels.recent}
                </div>
              }>
                {recentCommands.map((cmd) => (
                  <Command.Item
                    key={`recent-${cmd.id}`}
                    value={`recent ${cmd.label} ${cmd.keywords?.join(' ')}`}
                    onSelect={() => runCommand(cmd.id, cmd.action)}
                    className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary text-foreground"
                    style={{ width: 'calc(100% - 16px)' }}
                  >
                    <div className="flex-shrink-0 text-muted-foreground data-[selected=true]:text-primary">
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
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Base Commands by Category */}
            {categoryOrder.filter(cat => cat !== 'recent').map((category) => {
              const commands = baseCommands.filter(cmd => cmd.category === category);
              if (commands.length === 0) return null;

              return (
                <Command.Group
                  key={category}
                  heading={
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {categoryLabels[category]}
                    </div>
                  }
                >
                  {commands.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.description || ''} ${cmd.keywords?.join(' ')}`}
                      onSelect={() => runCommand(cmd.id, cmd.action)}
                      className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary text-foreground"
                      style={{ width: 'calc(100% - 16px)' }}
                    >
                      <div className="flex-shrink-0 text-muted-foreground">
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
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}

            {/* Screenplays */}
            {screenplayCommands.length > 0 && (
              <Command.Group heading={
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Screenplays
                </div>
              }>
                {screenplayCommands.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={`screenplay ${cmd.label} ${cmd.keywords?.join(' ')}`}
                    onSelect={() => runCommand(cmd.id, cmd.action)}
                    className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary text-foreground"
                    style={{ width: 'calc(100% - 16px)' }}
                  >
                    <div className="flex-shrink-0 text-muted-foreground">
                      {cmd.icon}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium truncate">{cmd.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            </Command.List>
          </ScrollArea>

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
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
