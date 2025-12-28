import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import type { SceneNumberPosition } from '@/types/settings';

export const sceneNumberingPluginKey = new PluginKey<SceneNumberingState>('sceneNumbering');

export interface SceneNumberingOptions {
  /** Whether to show scene numbers */
  enabled?: boolean;
  /** Position of scene numbers: left, right, or both (industry standard) */
  position?: SceneNumberPosition;
}

interface SceneNumberingState {
  decorations: DecorationSet;
  enabled: boolean;
  position: SceneNumberPosition;
  /** Scene numbers from WASM pagination result, keyed by element offset */
  wasmSceneNumbers: Map<number, string> | null;
}

/** Meta key for updating scene numbering settings (enabled, position) */
const SCENE_NUMBERING_UPDATE_META = 'sceneNumberingUpdate';

/** Meta key for receiving WASM-calculated scene numbers */
export const SCENE_NUMBERING_WASM_META = 'sceneNumberingWasm';

/**
 * Plugin that adds scene numbers to scene headings.
 *
 * Industry standard for production/shooting scripts:
 * - Scene numbers appear on BOTH left and right margins
 * - Numbers are calculated by WASM pagination engine
 * - Configurable: left only, right only, or both
 *
 * Numbers are determined by:
 * 1. WASM-calculated numbers (when pagination syncs them)
 * 2. The node's `sceneNumber` attribute (manual assignment)
 * 3. Sequential counting as fallback
 */
export function createSceneNumberingPlugin(options: SceneNumberingOptions = {}) {
  const initialEnabled = options.enabled ?? false;
  const initialPosition = options.position ?? 'both';

  return new Plugin<SceneNumberingState>({
    key: sceneNumberingPluginKey,

    state: {
      init(_, state): SceneNumberingState {
        return {
          decorations: createSceneNumberDecorations(state, initialEnabled, initialPosition, null),
          enabled: initialEnabled,
          position: initialPosition,
          wasmSceneNumbers: null,
        };
      },
      apply(tr, pluginState, oldState, newState): SceneNumberingState {
        // Check for WASM scene numbers update
        const wasmMeta = tr.getMeta(SCENE_NUMBERING_WASM_META) as Map<number, string> | undefined;
        if (wasmMeta !== undefined) {
          return {
            ...pluginState,
            wasmSceneNumbers: wasmMeta,
            decorations: createSceneNumberDecorations(
              newState,
              pluginState.enabled,
              pluginState.position,
              wasmMeta
            ),
          };
        }

        // Check for settings update (enabled, position)
        const updateMeta = tr.getMeta(SCENE_NUMBERING_UPDATE_META) as {
          enabled?: boolean;
          position?: SceneNumberPosition;
        } | undefined;

        if (updateMeta !== undefined) {
          const newEnabled = updateMeta.enabled ?? pluginState.enabled;
          const newPosition = updateMeta.position ?? pluginState.position;
          return {
            ...pluginState,
            enabled: newEnabled,
            position: newPosition,
            decorations: createSceneNumberDecorations(
              newState,
              newEnabled,
              newPosition,
              pluginState.wasmSceneNumbers
            ),
          };
        }

        // Only recalculate if document changed
        if (!tr.docChanged) return pluginState;

        return {
          ...pluginState,
          decorations: createSceneNumberDecorations(
            newState,
            pluginState.enabled,
            pluginState.position,
            pluginState.wasmSceneNumbers
          ),
        };
      }
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations ?? DecorationSet.empty;
      }
    }
  });
}

/**
 * Creates decoration widgets for scene numbers.
 *
 * Priority for number source:
 * 1. WASM-calculated numbers (from pagination result)
 * 2. Node's sceneNumber attribute (manual assignment)
 * 3. Sequential counting (fallback)
 */
function createSceneNumberDecorations(
  state: EditorState,
  enabled: boolean,
  position: SceneNumberPosition,
  wasmSceneNumbers: Map<number, string> | null
): DecorationSet {
  if (!enabled) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  let sequentialCount = 0;

  state.doc.forEach((node: ProseMirrorNode, offset: number) => {
    if (node.type.name === 'scene_heading') {
      sequentialCount++;

      // Priority: WASM numbers > node attribute > sequential count
      let sceneNumber: string;
      if (wasmSceneNumbers && wasmSceneNumbers.has(offset)) {
        sceneNumber = wasmSceneNumbers.get(offset)!;
      } else if (node.attrs.sceneNumber) {
        sceneNumber = node.attrs.sceneNumber;
      } else {
        sceneNumber = sequentialCount.toString();
      }

      // Create left number widget
      if (position === 'left' || position === 'both') {
        const leftWidget = Decoration.widget(offset + 1, () => {
          const span = document.createElement('span');
          span.className = 'pm-scene-number-left';
          span.textContent = sceneNumber;
          span.setAttribute('data-scene-number', sceneNumber);
          return span;
        }, {
          side: -1,  // Position before the text content
          key: `scene-num-left-${offset}-${sceneNumber}`
        });
        decorations.push(leftWidget);
      }

      // Create right number widget
      if (position === 'right' || position === 'both') {
        const rightWidget = Decoration.widget(offset + 1, () => {
          const span = document.createElement('span');
          span.className = 'pm-scene-number-right';
          span.textContent = sceneNumber;
          span.setAttribute('data-scene-number', sceneNumber);
          return span;
        }, {
          side: 1,  // Position after the text content
          key: `scene-num-right-${offset}-${sceneNumber}`
        });
        decorations.push(rightWidget);
      }
    }
  });

  return DecorationSet.create(state.doc, decorations);
}

/**
 * Update the scene numbering settings (enabled, position).
 */
export function updateSceneNumberingSettings(
  view: EditorView,
  options: { enabled?: boolean; position?: SceneNumberPosition }
) {
  const tr = view.state.tr.setMeta(SCENE_NUMBERING_UPDATE_META, options);
  view.dispatch(tr);
}

/**
 * Update scene numbers from WASM pagination result.
 * Called by the pagination plugin when it receives WASM results.
 */
export function updateWasmSceneNumbers(
  view: EditorView,
  sceneNumbers: Map<number, string>
) {
  const tr = view.state.tr.setMeta(SCENE_NUMBERING_WASM_META, sceneNumbers);
  view.dispatch(tr);
}

/**
 * Get the current scene numbering state.
 */
export function getSceneNumberingState(state: EditorState): SceneNumberingState | undefined {
  return sceneNumberingPluginKey.getState(state);
}
