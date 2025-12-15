import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';

export const sceneNumberingPluginKey = new PluginKey('sceneNumbering');

/**
 * Plugin that adds scene numbers to the left of scene headings.
 * Numbers are sequential and update dynamically as scenes are added/removed.
 */
export function createSceneNumberingPlugin() {
  return new Plugin({
    key: sceneNumberingPluginKey,

    state: {
      init(_, state) {
        return createSceneNumberDecorations(state);
      },
      apply(tr, oldDecoSet, oldState, newState) {
        // Only recalculate if document changed
        if (!tr.docChanged) return oldDecoSet;
        return createSceneNumberDecorations(newState);
      }
    },

    props: {
      decorations(state) {
        return this.getState(state);
      }
    }
  });
}

/**
 * Creates decoration widgets for scene numbers.
 */
function createSceneNumberDecorations(state: EditorState): DecorationSet {
  const decorations: Decoration[] = [];
  let sceneCount = 0;

  // Check if document starts with title page
  const firstNode = state.doc.firstChild;
  const hasTitlePage = firstNode?.type.name === 'title_page';

  // If document has title page, skip all scene numbers
  // (Spec scripts with title pages typically don't show scene numbers)
  if (hasTitlePage) {
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
