import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';

export const sceneNumberingPluginKey = new PluginKey<SceneNumberingState>('sceneNumbering');

export interface SceneNumberingOptions {
  // Force show scene numbers even when document has title page
  forceShow?: boolean;
}

interface SceneNumberingState {
  decorations: DecorationSet;
  forceShow: boolean;
}

const SCENE_NUMBERING_UPDATE_META = 'sceneNumberingUpdate';

/**
 * Plugin that adds scene numbers to the left of scene headings.
 * Numbers are sequential and update dynamically as scenes are added/removed.
 */
export function createSceneNumberingPlugin(options: SceneNumberingOptions = {}) {
  const initialForceShow = options.forceShow ?? false;

  return new Plugin<SceneNumberingState>({
    key: sceneNumberingPluginKey,

    state: {
      init(_, state): SceneNumberingState {
        return {
          decorations: createSceneNumberDecorations(state, initialForceShow),
          forceShow: initialForceShow,
        };
      },
      apply(tr, pluginState, oldState, newState): SceneNumberingState {
        // Check for forceShow update
        const updateMeta = tr.getMeta(SCENE_NUMBERING_UPDATE_META) as { forceShow?: boolean } | undefined;
        if (updateMeta !== undefined) {
          const newForceShow = updateMeta.forceShow ?? pluginState.forceShow;
          return {
            decorations: createSceneNumberDecorations(newState, newForceShow),
            forceShow: newForceShow,
          };
        }

        // Only recalculate if document changed
        if (!tr.docChanged) return pluginState;

        return {
          ...pluginState,
          decorations: createSceneNumberDecorations(newState, pluginState.forceShow),
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
function createSceneNumberDecorations(state: EditorState, forceShow: boolean): DecorationSet {
  const decorations: Decoration[] = [];
  let sceneCount = 0;

  // Check if document starts with title page
  const firstNode = state.doc.firstChild;
  const hasTitlePage = firstNode?.type.name === 'title_page';

  // If document has title page and forceShow is not enabled, skip all scene numbers
  // (Spec scripts with title pages typically don't show scene numbers)
  if (hasTitlePage && !forceShow) {
    return DecorationSet.empty;
  }

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
  options: { forceShow?: boolean }
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
