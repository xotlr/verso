"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Cmd/Ctrl", "S"], description: "Save screenplay" },
      { keys: ["Cmd/Ctrl", "Z"], description: "Undo" },
      { keys: ["Cmd/Ctrl", "Shift", "Z"], description: "Redo" },
      { keys: ["Cmd/Ctrl", "F"], description: "Find in document" },
      { keys: ["Cmd/Ctrl", "G"], description: "Find next" },
    ],
  },
  {
    title: "Formatting",
    shortcuts: [
      { keys: ["Tab"], description: "Cycle through element types" },
      { keys: ["Enter"], description: "New element (smart continuation)" },
      { keys: ["Cmd/Ctrl", "1"], description: "Scene heading" },
      { keys: ["Cmd/Ctrl", "2"], description: "Action" },
      { keys: ["Cmd/Ctrl", "3"], description: "Character" },
      { keys: ["Cmd/Ctrl", "4"], description: "Dialogue" },
      { keys: ["Cmd/Ctrl", "5"], description: "Parenthetical" },
      { keys: ["Cmd/Ctrl", "6"], description: "Transition" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Cmd/Ctrl", "Home"], description: "Go to beginning" },
      { keys: ["Cmd/Ctrl", "End"], description: "Go to end" },
      { keys: ["Cmd/Ctrl", "Up"], description: "Previous scene" },
      { keys: ["Cmd/Ctrl", "Down"], description: "Next scene" },
    ],
  },
  {
    title: "Selection",
    shortcuts: [
      { keys: ["Cmd/Ctrl", "A"], description: "Select all" },
      { keys: ["Shift", "Up/Down"], description: "Extend selection" },
      { keys: ["Cmd/Ctrl", "Shift", "Up"], description: "Select to scene start" },
      { keys: ["Cmd/Ctrl", "Shift", "Down"], description: "Select to scene end" },
    ],
  },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm text-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-medium bg-muted border border-border rounded">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
