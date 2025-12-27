/**
 * Type definitions for the ProseMirror screenplay editor.
 */

import type { EditorView } from 'prosemirror-view';
import type { ElementType } from '@/lib/prosemirror';
import type { AutocompleteState, AutocompleteSuggestion } from '@/lib/prosemirror/plugins';
import type { PaginationResult } from '@/lib/verso';
import type { DetectedShot } from '@/types/shotlist';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

/**
 * Options for initializing the ProseMirror editor.
 */
export interface UseProseMirrorEditorOptions {
  initialContent: string | null;
  onUpdate?: (content: string) => void;
  onScenesChange?: (scenes: SceneInfo[], characters: CharacterInfo[], detectedShots: DetectedShot[]) => void;
  editable?: boolean;
  /** Show scene numbers even when document has title page (production mode) */
  showSceneNumbers?: boolean;
  /** Enable timelapse mode - syncs content without recreating editor (for playback) */
  timelapseMode?: boolean;

  // Yjs CRDT collaboration options
  /** Yjs XmlFragment for collaborative editing */
  yXmlFragment?: Y.XmlFragment;
  /** Yjs Awareness for cursor/presence sync */
  awareness?: Awareness;
  /** User info for cursor display */
  yjsUserInfo?: {
    name: string;
    color: string;
  };
}

/**
 * Information about a scene heading in the screenplay.
 */
export interface SceneInfo {
  id: string;
  type: string;
  location: string;
  timeOfDay: string;
  sceneNumber: string | null;
  position: number;
  /** True if timeOfDay was inferred from keywords in the location, not explicitly stated */
  autoDetectedTimeOfDay?: boolean;
}

/**
 * Information about a character extracted from the screenplay.
 */
export interface CharacterInfo {
  id: string;
  name: string;
  dialogueCount: number;
}

/**
 * Information about a shot in the screenplay.
 */
export interface ShotInfo {
  id: string;
  shotType: string | null;
  subject: string | null;
  content: string;
  position: number;
  sceneId: string | null;
  linkedShotId: string | null;
}

/**
 * Return type for the useProseMirrorEditor hook.
 */
export interface UseProseMirrorEditorReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  view: EditorView | null;

  // State
  currentElementType: ElementType;
  currentSceneId: string | null;
  wordCount: number;
  pageCount: number;
  isReady: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isWasmReady: boolean;
  paginationTiming: number | null;
  paginationError: Error | null;

  // Pagination result for discrete page rendering
  paginationResult: PaginationResult | null;

  // Autocomplete
  autocompleteState: AutocompleteState | null;
  applyAutocompleteSuggestion: (suggestion: AutocompleteSuggestion) => void;

  // Commands
  undo: () => void;
  redo: () => void;
  focus: () => void;

  // Element commands
  setElementType: (type: ElementType) => void;
  insertSceneHeading: () => void;
  insertAction: () => void;
  insertCharacter: () => void;
  insertDialogue: () => void;
  insertParenthetical: () => void;
  insertTransition: () => void;

  // Formatting
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;

  // Content
  getContent: () => string;
  getPlainText: () => string;
}
