import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

/**
 * Typewriter Scroll Plugin
 *
 * Keeps the cursor line vertically centered during typing,
 * mimicking a physical typewriter where the paper moves but
 * the typing position stays fixed.
 */

export const typewriterScrollPluginKey = new PluginKey<TypewriterScrollState>('typewriterScroll');

export interface TypewriterScrollOptions {
  /** Whether typewriter scroll is enabled */
  enabled: boolean;
  /** Vertical position as percentage from top (default: 50 = centered) */
  offset: number;
  /** Whether to use smooth scrolling (respects prefers-reduced-motion) */
  smooth: boolean;
}

interface TypewriterScrollState {
  enabled: boolean;
  offset: number;
  smooth: boolean;
}

const DEFAULT_OPTIONS: TypewriterScrollOptions = {
  enabled: false, // Off by default per user preference
  offset: 50,     // Center of viewport
  smooth: true,
};

/**
 * Meta key for updating typewriter scroll settings.
 */
export const TYPEWRITER_SCROLL_UPDATE_META = 'typewriterScrollUpdate';

/**
 * Create a transaction that updates typewriter scroll settings.
 */
export function createTypewriterScrollUpdateTransaction(
  state: EditorState,
  options: Partial<TypewriterScrollOptions>
): Transaction {
  return state.tr.setMeta(TYPEWRITER_SCROLL_UPDATE_META, options);
}

/**
 * Update typewriter scroll settings in an editor view.
 */
export function updateTypewriterScrollSettings(
  view: EditorView,
  options: Partial<TypewriterScrollOptions>
): void {
  const tr = createTypewriterScrollUpdateTransaction(view.state, options);
  view.dispatch(tr);
}

/**
 * Toggle typewriter scroll on/off.
 */
export function toggleTypewriterScroll(view: EditorView): boolean {
  const state = typewriterScrollPluginKey.getState(view.state);
  if (!state) return false;

  updateTypewriterScrollSettings(view, { enabled: !state.enabled });
  return true;
}

/**
 * Get current typewriter scroll state.
 */
export function getTypewriterScrollState(state: EditorState): TypewriterScrollState | undefined {
  return typewriterScrollPluginKey.getState(state);
}

/**
 * Scroll the cursor into the typewriter position.
 * Uses requestAnimationFrame for smooth 60fps scrolling.
 */
function scrollCursorIntoTypewriterPosition(
  view: EditorView,
  offset: number,
  smooth: boolean
): void {
  // Get the cursor coordinates
  const { from } = view.state.selection;
  const coords = view.coordsAtPos(from);

  if (!coords) return;

  // Get the scroll container (editor wrapper)
  const scrollContainer = view.dom.closest('.pm-editor-scroll-container') as HTMLElement | null;
  if (!scrollContainer) return;

  // Calculate target position
  const containerRect = scrollContainer.getBoundingClientRect();
  const containerHeight = containerRect.height;
  const targetY = containerHeight * (offset / 100);

  // Current cursor position relative to container
  const cursorY = coords.top - containerRect.top;

  // How much we need to scroll
  const scrollDelta = cursorY - targetY;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const useSmooth = smooth && !prefersReducedMotion;

  // Scroll the container
  if (Math.abs(scrollDelta) > 5) { // Only scroll if delta is significant
    scrollContainer.scrollBy({
      top: scrollDelta,
      behavior: useSmooth ? 'smooth' : 'auto',
    });
  }
}

// Debounce scroll to prevent excessive calls
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
let animationFrameId: number | null = null;

function debouncedScroll(view: EditorView, offset: number, smooth: boolean): void {
  // Cancel any pending scroll
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Use requestAnimationFrame for smooth 60fps updates
  scrollTimeout = setTimeout(() => {
    animationFrameId = requestAnimationFrame(() => {
      scrollCursorIntoTypewriterPosition(view, offset, smooth);
    });
  }, 16); // ~60fps
}

/**
 * Create the typewriter scroll plugin.
 */
export function createTypewriterScrollPlugin(
  initialOptions: Partial<TypewriterScrollOptions> = {}
): Plugin {
  const options = { ...DEFAULT_OPTIONS, ...initialOptions };

  return new Plugin({
    key: typewriterScrollPluginKey,

    state: {
      init(): TypewriterScrollState {
        return {
          enabled: options.enabled,
          offset: options.offset,
          smooth: options.smooth,
        };
      },

      apply(tr, prevState): TypewriterScrollState {
        const updatePayload = tr.getMeta(TYPEWRITER_SCROLL_UPDATE_META) as Partial<TypewriterScrollOptions> | undefined;

        if (updatePayload) {
          return {
            ...prevState,
            ...updatePayload,
          };
        }

        return prevState;
      },
    },

    view(_editorView) {
      return {
        update(view, prevState) {
          const state = typewriterScrollPluginKey.getState(view.state);
          if (!state?.enabled) return;

          // Only scroll on selection/cursor changes, not on every update
          const selectionChanged = !view.state.selection.eq(prevState.selection);
          const docChanged = !view.state.doc.eq(prevState.doc);

          // Scroll when typing (doc changed) or cursor moved
          if (selectionChanged || docChanged) {
            // Don't scroll during rapid navigation (Cmd+Home, etc.)
            // Check if this is a large cursor jump (more than 1 page worth)
            const prevPos = prevState.selection.from;
            const newPos = view.state.selection.from;
            const largejump = Math.abs(newPos - prevPos) > 5000;

            if (!largejump) {
              debouncedScroll(view, state.offset, state.smooth);
            }
          }
        },

        destroy() {
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
          }
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
        },
      };
    },
  });
}
