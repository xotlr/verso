"use client";

import React, { useState, useEffect } from 'react';

interface ProjectLayoutProps {
  children: React.ReactNode;
  projectId: string;
  projectTitle: string;
  onSave?: () => void;
  onExport?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  rightSidebar?: React.ReactNode;
}

// Simplified ProjectLayout - header is now handled by the app layout
// This component just provides content structure with optional right sidebar
export function ProjectLayout({
  children,
  rightSidebar,
  projectTitle,
}: ProjectLayoutProps) {
  const [focusMode, setFocusMode] = useState(false);

  // Dispatch screenplay title update event for header breadcrumb
  useEffect(() => {
    if (projectTitle) {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title: projectTitle }
      }));
    }
  }, [projectTitle]);

  // Listen for focus mode toggle events
  useEffect(() => {
    const handleFocusModeToggle = () => {
      setFocusMode(prev => !prev);
    };

    window.addEventListener('focus-mode-toggle', handleFocusModeToggle);
    return () => window.removeEventListener('focus-mode-toggle', handleFocusModeToggle);
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      {!focusMode && rightSidebar}
    </div>
  );
}

export default ProjectLayout;
