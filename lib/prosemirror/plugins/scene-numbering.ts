import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';

export const sceneNumberingPluginKey = new PluginKey<SceneNumberingState>('sceneNumbering');

export interface SceneNumberingOptions {
  // Whether to show scene numbers
  enabled?: boolean;
}

interface SceneNumberingState {
  decorations: DecorationSet;
  enabled: boolean;
}

const SCENE_NUMBERING_UPDATE_META = 'sceneNumberingUpdate';

/**
 * Plugin that adds scene numbers to the left of scene headings.
 * Numbers are sequential and update dynamically as scenes are added/removed.
 */
export function createSceneNumberingPlugin(options: SceneNumberingOptions = {}) {
  const initialEnabled = options.enabled ?? false;

  return new Plugin<SceneNumberingState>({
    key: sceneNumberingPluginKey,

    state: {
      init(_, state): SceneNumberingState {
        return {
          decorations: createSceneNumberDecorations(state, initialEnabled),
          enabled: initialEnabled,
        };
      },
      apply(tr, pluginState, oldState, newState): SceneNumberingState {
        // Check for enabled update
        const updateMeta = tr.getMeta(SCENE_NUMBERING_UPDATE_META) as { enabled?: boolean } | undefined;
        if (updateMeta !== undefined) {
          const newEnabled = updateMeta.enabled ?? pluginState.enabled;
          return {
            decorations: createSceneNumberDecorations(newState, newEnabled),
            enabled: newEnabled,
          };
        }

        // Only recalculate if document changed
        if (!tr.docChanged) return pluginState;

        return {
          ...pluginState,
          decorations: createSceneNumberDecorations(newState, pluginState.enabled),
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
 */
function createSceneNumberDecorations(state: EditorState, enabled: boolean): DecorationSet {
  // If scene numbering is disabled, return empty
  if (!enabled) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  let sceneCount = 0;

  state.doc.forEach((node: ProseMirrorNode, offset: number) => {
    if (node.type.name === 'scene_heading') {
      sceneCount++;

      // Create widget for left number
      const widget = Decoration.widget(offset, () => {
        const span = document.createElement('span');
        span.className = 'pm-scene-number-left';
        span.textContent = sceneCount.toString();
        span.setAttribute('data-scene-number', sceneCount.toString());
        return span;
      }, {
        side: -1,  // Position before the node
        key: `scene-num-${offset}-${sceneCount}`
      });

      decorations.push(widget);
    }
  });

  return DecorationSet.create(state.doc, decorations);
}

/**
 * Update the scene numbering settings.
 */
export function updateSceneNumberingSettings(
  view: EditorView,
  options: { enabled?: boolean }
) {
  const tr = view.state.tr.setMeta(SCENE_NUMBERING_UPDATE_META, options);
  view.dispatch(tr);
}

/**
 * Get the current scene numbering state.
 */
export function getSceneNumberingState(state: EditorState): SceneNumberingState | undefined {
  return sceneNumberingPluginKey.getState(state);
}
