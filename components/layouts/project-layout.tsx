"use client";

import React, { useState, useEffect } from 'react';
import { ProjectHeader } from "@/components/project-header";

interface ProjectLayoutProps {
  children: React.ReactNode;
  projectId: string;
  projectTitle: string;
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onToggleRightSidebar?: () => void;
  showRightSidebarToggle?: boolean;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  rightSidebar?: React.ReactNode;
}

// Simplified ProjectLayout - sidebar is now handled by the app layout
// This component provides the project header and content structure
export function ProjectLayout({
  children,
  projectId,
  projectTitle,
  onSave,
  onExport,
  onShare,
  onToggleRightSidebar,
  showRightSidebarToggle = false,
  isSaving = false,
  hasUnsavedChanges = false,
  rightSidebar,
}: ProjectLayoutProps) {
  const [focusMode, setFocusMode] = useState(false);

  // Listen for focus mode toggle events
  useEffect(() => {
    const handleFocusModeToggle = () => {
      setFocusMode(prev => !prev);
    };

    window.addEventListener('focus-mode-toggle', handleFocusModeToggle);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeToggle);
  }, []);

  return (
    <>
      {!focusMode && (
        <ProjectHeader
          projectId={projectId}
          projectTitle={projectTitle}
          onSave={onSave}
          onExport={onExport}
          onShare={onShare}
          onToggleRightSidebar={onToggleRightSidebar}
          showRightSidebarToggle={showRightSidebarToggle}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      )}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        {!focusMode && rightSidebar}
      </main>
    </>
  );
}

export default ProjectLayout;
