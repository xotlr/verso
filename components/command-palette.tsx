'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
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
  Maximize2,
  Layout,
  Hash,
  Clock,
  FolderOpen,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface CommandItemData {
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
  const baseCommands: CommandItemData[] = useMemo(() => [
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
      keywords: ['ai', 'verso', 'analyze', 'feedback', 'review'],
      action: () => {
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
      id: 'focus-mode',
      label: 'Toggle Focus Mode',
      description: 'Hide all UI elements',
      icon: <Maximize2 className="h-4 w-4" />,
      shortcut: '⌘⇧F',
      category: 'view',
      keywords: ['distraction', 'focus', 'zen', 'fullscreen'],
      action: () => {
        window.dispatchEvent(new CustomEvent('focus-mode-toggle'));
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
  const screenplayCommands: CommandItemData[] = useMemo(() =>
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
    const map = new Map<string, CommandItemData>();
    [...baseCommands, ...screenplayCommands].forEach(cmd => {
      map.set(cmd.id, cmd);
    });
    return map;
  }, [baseCommands, screenplayCommands]);

  // Recent commands (only show ones that exist)
  const recentCommands: CommandItemData[] = useMemo(() =>
    recentIds
      .map(id => commandMap.get(id))
      .filter((cmd): cmd is CommandItemData => cmd !== undefined)
      .map(cmd => ({ ...cmd, category: 'recent' as const })),
    [recentIds, commandMap]
  );

  const categoryLabels: Record<string, string> = {
    recent: 'Recent',
    navigation: 'Navigation',
    actions: 'Actions',
    formatting: 'Formatting',
    view: 'View',
    settings: 'Settings',
  };

  // Render a command item with consistent styling
  const renderCommandItem = (cmd: CommandItemData, keyPrefix = '') => (
    <CommandItem
      key={`${keyPrefix}${cmd.id}`}
      value={`${keyPrefix} ${cmd.label} ${cmd.description || ''} ${cmd.keywords?.join(' ')}`}
      onSelect={() => runCommand(cmd.id, cmd.action)}
      className="min-h-[44px] py-3 px-3 gap-3"
    >
      <div className="flex-shrink-0 text-muted-foreground">
        {cmd.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{cmd.label}</div>
        {cmd.description && (
          <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
        )}
      </div>
      {cmd.shortcut && (
        <CommandShortcut className="hidden sm:inline-flex">
          {cmd.shortcut}
        </CommandShortcut>
      )}
    </CommandItem>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden [&>button]:hidden",
          // Desktop: centered modal
          "sm:max-w-lg sm:rounded-xl",
          // Mobile: full screen with safe area
          "max-w-full w-full h-[100dvh] sm:h-auto sm:max-h-[85vh]",
          "rounded-none sm:rounded-xl",
          "top-0 left-0 sm:top-[50%] sm:left-[50%]",
          "translate-x-0 translate-y-0 sm:translate-x-[-50%] sm:translate-y-[-50%]"
        )}
      >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>

        <Command className="flex flex-col h-full" loop shouldFilter={true}>
          {/* Search Input */}
          <div className="border-b">
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="h-14 sm:h-12 text-base"
            />
          </div>

          {/* Commands List */}
          <ScrollArea className="flex-1 max-h-[calc(100dvh-8rem)] sm:max-h-[50vh]">
            <CommandList className="max-h-none">
              <CommandEmpty className="py-12 text-center">
                <div className="text-muted-foreground">No commands found</div>
                <div className="text-xs text-muted-foreground/60 mt-1">Try a different search term</div>
              </CommandEmpty>

              {/* Recent Commands */}
              {recentCommands.length > 0 && (
                <>
                  <CommandGroup heading={
                    <span className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {categoryLabels.recent}
                    </span>
                  }>
                    {recentCommands.map((cmd) => renderCommandItem(cmd, 'recent-'))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Navigation Commands */}
              <CommandGroup heading={categoryLabels.navigation}>
                {baseCommands.filter(cmd => cmd.category === 'navigation').map((cmd) => renderCommandItem(cmd))}
              </CommandGroup>

              {/* Screenplays */}
              {screenplayCommands.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-3 w-3" />
                      Screenplays
                    </span>
                  }>
                    {screenplayCommands.map((cmd) => renderCommandItem(cmd, 'screenplay-'))}
                  </CommandGroup>
                </>
              )}

              <CommandSeparator />

              {/* Actions Commands */}
              <CommandGroup heading={categoryLabels.actions}>
                {baseCommands.filter(cmd => cmd.category === 'actions').map((cmd) => renderCommandItem(cmd))}
              </CommandGroup>

              <CommandSeparator />

              {/* Formatting Commands */}
              <CommandGroup heading={categoryLabels.formatting}>
                {baseCommands.filter(cmd => cmd.category === 'formatting').map((cmd) => renderCommandItem(cmd))}
              </CommandGroup>

              <CommandSeparator />

              {/* View Commands */}
              <CommandGroup heading={categoryLabels.view}>
                {baseCommands.filter(cmd => cmd.category === 'view').map((cmd) => renderCommandItem(cmd))}
              </CommandGroup>

              <CommandSeparator />

              {/* Settings Commands */}
              <CommandGroup heading={categoryLabels.settings}>
                {baseCommands.filter(cmd => cmd.category === 'settings').map((cmd) => renderCommandItem(cmd))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
            <div className="hidden sm:flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">esc</kbd>
                Close
              </span>
            </div>
            {/* Mobile: tap to close hint */}
            <div className="sm:hidden text-center flex-1">
              Tap outside or swipe down to close
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
