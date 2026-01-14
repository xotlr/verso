/**
 * Editor hooks barrel exports.
 */

// Main editor hook
export { useProseMirrorEditor } from './use-prosemirror-editor';

// Types
export type {
  UseProseMirrorEditorOptions,
  UseProseMirrorEditorReturn,
  SceneInfo,
  CharacterInfo,
  ShotInfo,
} from './types';

// Document extractors (pure utility functions)
export {
  calculateWordCount,
  calculatePageCount,
  extractScenes,
  extractCharacters,
  extractShots,
} from './document-extractors';

// Editor commands
export { useEditorCommands } from './use-editor-commands';
export type { EditorCommands } from './use-editor-commands';

// Pagination
export { usePagination } from './use-pagination';

// Other hooks
export { useResponsiveScale } from './use-responsive-scale';
export { useEditorZoom } from './use-editor-zoom';
export { useEditorSettings } from './use-editor-settings';
export { useEditorHighlighting } from './use-editor-highlighting';
export { useEditorDialogs } from './use-editor-dialogs';
export type { EditorDialogs } from './use-editor-dialogs';
export { useEditorFormatting } from './use-editor-formatting';
export type { EditorFormatting } from './use-editor-formatting';
