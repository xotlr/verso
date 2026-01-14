/**
 * Type extensions for ProseMirror
 *
 * ProseMirror's EditorView has internal properties that aren't exposed in the
 * public TypeScript types. These extensions provide type-safe access to commonly
 * used internal properties.
 */

import type { EditorView } from 'prosemirror-view';

/**
 * Extended EditorView interface that includes internal properties.
 *
 * Note: `docView` is ProseMirror's internal DOM representation of the document.
 * It exists at runtime but isn't part of the public API. It's commonly used to:
 * - Check if the view has been fully initialized
 * - Detect if the view has been destroyed
 *
 * This property may change between ProseMirror versions, so use with caution.
 */
export interface EditorViewWithInternals extends EditorView {
  /**
   * The internal document view (DOM representation).
   * Null/undefined when the view is destroyed or not yet initialized.
   */
  docView: unknown | null;
}

/**
 * Type guard to check if an EditorView is initialized and not destroyed.
 *
 * @param view - The EditorView to check
 * @returns true if the view is ready for operations, false otherwise
 *
 * @example
 * ```ts
 * import { isViewReady } from '@/types/prosemirror';
 *
 * if (isViewReady(view)) {
 *   // Safe to call view methods that require initialized DOM
 *   const coords = view.coordsAtPos(pos);
 * }
 * ```
 */
export function isViewReady(view: EditorView | null | undefined): view is EditorView {
  if (!view) return false;
  // Access docView to check if view is initialized and not destroyed
  return !!(view as EditorViewWithInternals).docView;
}

/**
 * Type guard with the internal type for when you need access to docView directly.
 */
export function isViewReadyWithInternals(
  view: EditorView | null | undefined
): view is EditorViewWithInternals {
  if (!view) return false;
  return !!(view as EditorViewWithInternals).docView;
}
