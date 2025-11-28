"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ScreenplayEditorWrapper } from "@/components/screenplay-editor-wrapper";
import { SettingsPanel } from "@/components/settings-panel";
import { CommandPalette } from "@/components/command-palette";
import { BottomNav } from "@/components/bottom-nav";
import { ProjectLayout } from "@/components/layouts/project-layout";
import { useSettings } from "@/contexts/settings-context";
import { ImportDropZoneOverlay, ImportResult } from "@/components/import-drop-zone";

export default function EditorPage() {
  const params = useParams();
  const id = params.id as string;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [documentTitle] = useState("Untitled Screenplay");
  const { settings, updateLayoutSettings } = useSettings();
  const isSidebarCollapsed = settings.layout.sidebarCollapsed;

  const toggleSidebar = () => {
    updateLayoutSettings({ sidebarCollapsed: !isSidebarCollapsed });
  };

  const handleImportComplete = useCallback(async (result: ImportResult) => {
    if (!result.success || !result.content) return;

    // Update the screenplay via API
    try {
      const response = await fetch(`/api/screenplays/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: result.content,
          title: result.title || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update screenplay');
      }

      // Reload the page to refresh the editor with new content
      window.location.reload();
    } catch (error) {
      console.error('Error importing screenplay:', error);
    }
  }, [id]);

  // Command palette keyboard shortcut and custom event listener
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
    const handleCommandPaletteOpen = () => {
      setCommandPaletteOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('command-palette-open', handleCommandPaletteOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('command-palette-open', handleCommandPaletteOpen);
    };
  }, []);

  return (
    <ProjectLayout
      projectId={id}
      projectTitle={documentTitle}
      onToggleRightSidebar={toggleSidebar}
      showRightSidebarToggle={true}
    >
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenSettings={() => {
          setCommandPaletteOpen(false);
          setSettingsOpen(true);
        }}
      />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Editor */}
      <div className="flex-1 overflow-hidden has-bottom-nav md:pb-0 h-full">
        <ScreenplayEditorWrapper projectId={id} />
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onSettingsClick={() => setSettingsOpen(true)} />

      {/* Import Drop Zone Overlay */}
      <ImportDropZoneOverlay
        screenplayId={id}
        onImportComplete={handleImportComplete}
        onImportError={(error) => console.error('Import error:', error)}
      />
    </ProjectLayout>
  );
}