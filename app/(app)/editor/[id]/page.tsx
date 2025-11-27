"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ScreenplayEditorWrapper } from "@/components/screenplay-editor-wrapper";
import { SettingsPanel } from "@/components/settings-panel";
import { CommandPalette } from "@/components/command-palette";
import { BottomNav } from "@/components/bottom-nav";
import { ProjectLayout } from "@/components/layouts/project-layout";
import { useSettings } from "@/contexts/settings-context";

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
        <ScreenplayEditorWrapper />
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onSettingsClick={() => setSettingsOpen(true)} />
    </ProjectLayout>
  );
}