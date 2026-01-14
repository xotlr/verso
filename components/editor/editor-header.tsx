"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { EditableTitle } from "@/components/editable-title";
import { ArrowLeft, Play, History } from "lucide-react";
import { IoShareOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import { useIsGlass } from "@/hooks/use-glass-styles";
import { useEditorCommands } from "@/contexts/editor-commands-context";

interface EditorHeaderProps {
  className?: string;
}

export function EditorHeader({ className }: EditorHeaderProps) {
  const editorCommands = useEditorCommands();
  const isGlass = useIsGlass();
  const [screenplayTitle, setScreenplayTitle] = useState<string>("Loading...");
  const [isOnline, setIsOnline] = useState(true);
  const [yjsStatus, setYjsStatus] = useState<{
    enabled: boolean;
    isConnected: boolean;
    isSynced: boolean;
    isPersistenceSynced: boolean;
  }>({ enabled: false, isConnected: false, isSynced: false, isPersistenceSynced: false });

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for screenplay title updates from editor
  useEffect(() => {
    const handleTitleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string }>;
      setScreenplayTitle(customEvent.detail.title);
    };

    window.addEventListener('screenplay-title-update', handleTitleUpdate);
    return () => window.removeEventListener('screenplay-title-update', handleTitleUpdate);
  }, []);

  // Listen for Yjs collaboration status updates
  useEffect(() => {
    const handleYjsStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{
        enabled: boolean;
        isConnected: boolean;
        isSynced: boolean;
        isPersistenceSynced: boolean;
      }>;
      setYjsStatus(customEvent.detail);
    };

    window.addEventListener('yjs-status-update', handleYjsStatus);
    return () => window.removeEventListener('yjs-status-update', handleYjsStatus);
  }, []);

  // Use editor commands context instead of window events
  const handleTitleSave = useCallback((newTitle: string) => {
    editorCommands.saveTitle(newTitle);
  }, [editorCommands]);

  const handleShare = editorCommands.openShare;
  const handleTimelapse = editorCommands.openTimelapse;
  const handleVersionHistory = editorCommands.openVersionHistory;

  return (
    <header className={cn(
      "sticky top-0 z-40 flex h-11 shrink-0 items-center gap-2 px-4",
      !isGlass && "bg-sidebar",
      className
    )}>
      {/* Mobile: Back button on left */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9 -ml-1"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Title - editable on both mobile and desktop */}
      <div className="flex-1 flex items-center md:flex-none">
        <EditableTitle
          value={screenplayTitle}
          onSave={handleTitleSave}
          className="text-sm font-medium"
        />
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 text-orange-500">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-medium hidden md:inline">Offline</span>
        </div>
      )}

      {/* Yjs collaboration status */}
      {yjsStatus.enabled && isOnline && (
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "h-2 w-2 rounded-full",
            yjsStatus.isSynced && yjsStatus.isPersistenceSynced
              ? "bg-green-500"
              : "bg-orange-500 animate-pulse"
          )} />
          <span className="text-xs text-muted-foreground hidden md:inline">
            {!yjsStatus.isPersistenceSynced
              ? "Loading..."
              : yjsStatus.isSynced
                ? "Synced"
                : yjsStatus.isConnected
                  ? "Syncing..."
                  : "Connecting..."}
          </span>
        </div>
      )}

      {/* Action buttons - right side */}
      <div className="ml-auto md:ml-2 flex items-center gap-1">
        {/* Timelapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleTimelapse}
          title="View Timelapse"
        >
          <Play className="h-4 w-4" />
        </Button>

        {/* Version History button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleVersionHistory}
          title="Version History"
        >
          <History className="h-4 w-4" />
        </Button>

        {/* Share button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleShare}
          title="Share"
        >
          <IoShareOutline className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
