"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Pencil, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ShortcutId,
  ShortcutCategory,
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATEGORIES,
  getShortcutsByCategory,
  formatKeysAsArray,
} from "@/lib/shortcuts/shortcuts-config";
import { useShortcuts } from "@/lib/shortcuts/shortcuts-context";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editable?: boolean;
}

interface ShortcutCaptureState {
  shortcutId: ShortcutId | null;
  keys: string[];
  conflict: ShortcutId | null;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  editable = false,
}: KeyboardShortcutsDialogProps) {
  const {
    shortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    hasConflict,
    isCustomized,
  } = useShortcuts();

  const [captureState, setCaptureState] = useState<ShortcutCaptureState>({
    shortcutId: null,
    keys: [],
    conflict: null,
  });

  const captureRef = useRef<HTMLDivElement>(null);

  // Get shortcuts grouped by category
  const groupedShortcuts = getShortcutsByCategory(shortcuts);

  // Sort categories by order
  const sortedCategories = (Object.keys(groupedShortcuts) as ShortcutCategory[]).sort(
    (a, b) => SHORTCUT_CATEGORIES[a].order - SHORTCUT_CATEGORIES[b].order
  );

  // Start capturing a new shortcut
  const startCapture = useCallback((shortcutId: ShortcutId) => {
    // Check if this shortcut is editable
    if (!DEFAULT_SHORTCUTS[shortcutId].editable) return;

    setCaptureState({
      shortcutId,
      keys: [],
      conflict: null,
    });
  }, []);

  // Cancel capture
  const cancelCapture = useCallback(() => {
    setCaptureState({
      shortcutId: null,
      keys: [],
      conflict: null,
    });
  }, []);

  // Handle key capture
  useEffect(() => {
    if (!captureState.shortcutId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels capture
      if (e.key === "Escape") {
        cancelCapture();
        return;
      }

      // Build keys array from the event
      const keys: string[] = [];

      // Add modifiers first
      if (e.metaKey || e.ctrlKey) keys.push("Mod");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");

      // Add the main key if it's not a modifier
      const isModifier = ["Control", "Meta", "Alt", "Shift"].includes(e.key);
      if (!isModifier) {
        // Normalize key name
        let keyName = e.key;
        if (keyName.length === 1) {
          keyName = keyName.toUpperCase();
        }
        keys.push(keyName);

        // Check for conflicts
        const conflictId = hasConflict(keys, captureState.shortcutId!);

        if (conflictId) {
          setCaptureState((prev) => ({
            ...prev,
            keys,
            conflict: conflictId,
          }));
        } else {
          // No conflict - save the shortcut
          updateShortcut(captureState.shortcutId!, keys);
          cancelCapture();
        }
      } else {
        // Just show the modifiers being pressed
        setCaptureState((prev) => ({
          ...prev,
          keys,
          conflict: null,
        }));
      }
    };

    const handleKeyUp = () => {
      // If only modifiers were pressed and released, show that we need a main key
      if (captureState.keys.length > 0 && captureState.keys.every((k) => ["Mod", "Alt", "Shift"].includes(k))) {
        setCaptureState((prev) => ({
          ...prev,
          keys: [],
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [captureState.shortcutId, captureState.keys, hasConflict, updateShortcut, cancelCapture]);

  // Force override with conflict
  const forceOverride = useCallback(() => {
    if (captureState.shortcutId && captureState.keys.length > 0) {
      // First, clear the conflicting shortcut
      if (captureState.conflict) {
        resetShortcut(captureState.conflict);
      }
      // Then set the new shortcut
      updateShortcut(captureState.shortcutId, captureState.keys);
      cancelCapture();
    }
  }, [captureState, updateShortcut, resetShortcut, cancelCapture]);

  // Render a single shortcut row
  const renderShortcutRow = (
    shortcutId: ShortcutId,
    keys: string[],
    description: string,
    isEditable: boolean
  ) => {
    const isCapturing = captureState.shortcutId === shortcutId;
    const customized = isCustomized(shortcutId);

    return (
      <div
        key={shortcutId}
        className={cn(
          "flex items-center justify-between py-2 px-2 -mx-2 rounded-md transition-colors",
          isCapturing && "bg-accent",
          editable && isEditable && !isCapturing && "hover:bg-muted/50 cursor-pointer"
        )}
        onClick={() => editable && isEditable && !isCapturing && startCapture(shortcutId)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{description}</span>
          {customized && !isCapturing && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Custom
            </Badge>
          )}
          {!isEditable && editable && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              Locked
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isCapturing ? (
            <div ref={captureRef} className="flex items-center gap-2">
              {captureState.conflict ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="text-xs">
                      Used by &quot;{DEFAULT_SHORTCUTS[captureState.conflict].description}&quot;
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      forceOverride();
                    }}
                  >
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelCapture();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 min-w-[120px] justify-end">
                    {captureState.keys.length > 0 ? (
                      formatKeysAsArray(captureState.keys).map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground border border-primary rounded animate-pulse">
                            {key}
                          </kbd>
                          {i < captureState.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground animate-pulse">
                        Press keys...
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelCapture();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {formatKeysAsArray(keys).map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-xs font-medium bg-muted border border-border rounded">
                      {key}
                    </kbd>
                    {keyIndex < keys.length - 1 && (
                      <span className="text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
              {editable && isEditable && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              {editable && customized && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetShortcut(shortcutId);
                  }}
                  title="Reset to default"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          {editable && (
            <DialogDescription>
              Click on a shortcut to change it. Press Escape to cancel.
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {sortedCategories.map((category) => {
              const categoryShortcuts = groupedShortcuts[category];
              if (categoryShortcuts.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    {SHORTCUT_CATEGORIES[category].title}
                  </h3>
                  <div className="space-y-1 group">
                    {categoryShortcuts.map((shortcut) =>
                      renderShortcutRow(
                        shortcut.id,
                        shortcut.keys,
                        shortcut.description,
                        shortcut.editable
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {editable && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={resetAllShortcuts}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All to Defaults
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Standalone shortcuts list component (for embedding in settings without dialog wrapper)
export function KeyboardShortcutsList({
  editable = false,
}: {
  editable?: boolean;
}) {
  const {
    shortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    hasConflict,
    isCustomized,
  } = useShortcuts();

  const [captureState, setCaptureState] = useState<ShortcutCaptureState>({
    shortcutId: null,
    keys: [],
    conflict: null,
  });

  // Get shortcuts grouped by category
  const groupedShortcuts = getShortcutsByCategory(shortcuts);

  // Sort categories by order
  const sortedCategories = (Object.keys(groupedShortcuts) as ShortcutCategory[]).sort(
    (a, b) => SHORTCUT_CATEGORIES[a].order - SHORTCUT_CATEGORIES[b].order
  );

  // Start capturing a new shortcut
  const startCapture = useCallback((shortcutId: ShortcutId) => {
    if (!DEFAULT_SHORTCUTS[shortcutId].editable) return;

    setCaptureState({
      shortcutId,
      keys: [],
      conflict: null,
    });
  }, []);

  // Cancel capture
  const cancelCapture = useCallback(() => {
    setCaptureState({
      shortcutId: null,
      keys: [],
      conflict: null,
    });
  }, []);

  // Handle key capture
  useEffect(() => {
    if (!captureState.shortcutId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        cancelCapture();
        return;
      }

      const keys: string[] = [];

      if (e.metaKey || e.ctrlKey) keys.push("Mod");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");

      const isModifier = ["Control", "Meta", "Alt", "Shift"].includes(e.key);
      if (!isModifier) {
        let keyName = e.key;
        if (keyName.length === 1) {
          keyName = keyName.toUpperCase();
        }
        keys.push(keyName);

        const conflictId = hasConflict(keys, captureState.shortcutId!);

        if (conflictId) {
          setCaptureState((prev) => ({
            ...prev,
            keys,
            conflict: conflictId,
          }));
        } else {
          updateShortcut(captureState.shortcutId!, keys);
          cancelCapture();
        }
      } else {
        setCaptureState((prev) => ({
          ...prev,
          keys,
          conflict: null,
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [captureState.shortcutId, hasConflict, updateShortcut, cancelCapture]);

  const forceOverride = useCallback(() => {
    if (captureState.shortcutId && captureState.keys.length > 0) {
      if (captureState.conflict) {
        resetShortcut(captureState.conflict);
      }
      updateShortcut(captureState.shortcutId, captureState.keys);
      cancelCapture();
    }
  }, [captureState, updateShortcut, resetShortcut, cancelCapture]);

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => {
        const categoryShortcuts = groupedShortcuts[category];
        if (categoryShortcuts.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {SHORTCUT_CATEGORIES[category].title}
            </h3>
            <div className="space-y-1">
              {categoryShortcuts.map((shortcut) => {
                const isCapturing = captureState.shortcutId === shortcut.id;
                const customized = isCustomized(shortcut.id);

                return (
                  <div
                    key={shortcut.id}
                    className={cn(
                      "flex items-center justify-between py-2 px-2 -mx-2 rounded-md transition-colors",
                      isCapturing && "bg-accent",
                      editable && shortcut.editable && !isCapturing && "hover:bg-muted/50 cursor-pointer"
                    )}
                    onClick={() => editable && shortcut.editable && !isCapturing && startCapture(shortcut.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{shortcut.description}</span>
                      {customized && !isCapturing && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Custom
                        </Badge>
                      )}
                      {!shortcut.editable && editable && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          Locked
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isCapturing ? (
                        <div className="flex items-center gap-2">
                          {captureState.conflict ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                  Conflicts with &quot;{DEFAULT_SHORTCUTS[captureState.conflict].description}&quot;
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  forceOverride();
                                }}
                              >
                                Replace
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelCapture();
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 min-w-[120px] justify-end">
                                {captureState.keys.length > 0 ? (
                                  formatKeysAsArray(captureState.keys).map((key, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                      <kbd className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground border border-primary rounded animate-pulse">
                                        {key}
                                      </kbd>
                                      {i < captureState.keys.length - 1 && (
                                        <span className="text-muted-foreground">+</span>
                                      )}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground animate-pulse">
                                    Press keys...
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelCapture();
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {formatKeysAsArray(shortcut.keys).map((key, keyIndex) => (
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
                          {editable && customized && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                resetShortcut(shortcut.id);
                              }}
                              title="Reset to default"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {editable && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={resetAllShortcuts}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All to Defaults
          </Button>
        </div>
      )}
    </div>
  );
}
