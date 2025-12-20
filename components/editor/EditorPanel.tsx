'use client';

import React from 'react';
import { EditorPanelDesktop } from './EditorPanelDesktop';
import { EditorPanelMobile } from './EditorPanelMobile';
import type { SceneInfo, CharacterInfo } from '@/hooks/editor/use-prosemirror-editor';
import type { EditorView } from 'prosemirror-view';
import type { SceneWithShots, Shot, DetectedShot } from '@/types/shotlist';

interface EditorPanelProps {
  scenes: SceneInfo[];
  characters: CharacterInfo[];
  view: EditorView | null;
  currentSceneId?: string | null;
  screenplayId?: string;
  scenesWithShots?: SceneWithShots[];
  detectedShots?: DetectedShot[];
  onShotsChange?: (shots: Shot[]) => void;
  onEditShot?: (shot: Shot) => void;
  onAddShot?: (sceneId: string) => void;
  onAddDetectedShot?: (shot: DetectedShot) => void;
}

/**
 * Unified editor panel that renders the appropriate variant based on screen size.
 * - Mobile: Bottom drawer with FAB trigger
 * - Desktop: Docked sidebar with activity bar
 */
export function EditorPanel({
  scenes,
  characters,
  view,
  currentSceneId,
  screenplayId,
  scenesWithShots,
  detectedShots,
  onShotsChange,
  onEditShot,
  onAddShot,
  onAddDetectedShot,
}: EditorPanelProps) {
  const sharedProps = {
    scenes,
    characters,
    view,
    currentSceneId,
    screenplayId,
    scenesWithShots,
    detectedShots,
    onShotsChange,
    onEditShot,
    onAddShot,
    onAddDetectedShot,
  };

  return (
    <>
      {/* Desktop panel - hidden on mobile via internal check */}
      <EditorPanelDesktop {...sharedProps} />

      {/* Mobile panel - only renders drawer on mobile, triggered by edge swipe */}
      <EditorPanelMobile {...sharedProps} />
    </>
  );
}

// Re-export context for convenience
export { EditorPanelProvider, useEditorPanel } from './EditorPanelContext';
export type { EditorPanelType } from './EditorPanelContext';
