import { Plugin, PluginKey, Transaction, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export const shotMarkersPluginKey = new PluginKey<ShotMarkersState>('shotMarkers');

/**
 * A shot marker links a document position to a shot ID.
 * These are invisible metadata markers attached to text positions.
 */
export interface ShotMarker {
  id: string;           // Unique marker ID
  shotId: string;       // Reference to the Shot in the database
  position: number;     // Document position
  sceneId: string;      // Scene this marker belongs to
}

export interface ShotMarkersState {
  markers: ShotMarker[];
}

// Meta key for updating markers
const SHOT_MARKERS_UPDATE_META = 'shotMarkersUpdate';

interface ShotMarkersUpdatePayload {
  type: 'add' | 'remove' | 'set';
  marker?: Omit<ShotMarker, 'id'>;
  markerId?: string;
  markers?: ShotMarker[];
}

/**
 * Plugin that tracks shot markers as invisible metadata in the document.
 * Markers link document positions to shot IDs without visual representation.
 */
export function createShotMarkersPlugin(initialMarkers: ShotMarker[] = []) {
  return new Plugin<ShotMarkersState>({
    key: shotMarkersPluginKey,

    state: {
      init(): ShotMarkersState {
        return {
          markers: initialMarkers,
        };
      },

      apply(tr: Transaction, pluginState: ShotMarkersState): ShotMarkersState {
        // Check for marker updates
        const updateMeta = tr.getMeta(SHOT_MARKERS_UPDATE_META) as ShotMarkersUpdatePayload | undefined;

        if (updateMeta) {
          switch (updateMeta.type) {
            case 'add':
              if (updateMeta.marker) {
                const newMarker: ShotMarker = {
                  ...updateMeta.marker,
                  id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                };
                return {
                  markers: [...pluginState.markers, newMarker],
                };
              }
              break;

            case 'remove':
              if (updateMeta.markerId) {
                return {
                  markers: pluginState.markers.filter(m => m.id !== updateMeta.markerId),
                };
              }
              break;

            case 'set':
              if (updateMeta.markers) {
                return {
                  markers: updateMeta.markers,
                };
              }
              break;
          }
        }

        // If document changed, remap marker positions
        if (tr.docChanged) {
          const mappedMarkers = pluginState.markers
            .map(marker => {
              const newPos = tr.mapping.map(marker.position);
              // If position was deleted (mapped to same spot as another), remove marker
              if (newPos === marker.position && tr.mapping.mapResult(marker.position).deleted) {
                return null;
              }
              return {
                ...marker,
                position: newPos,
              };
            })
            .filter((m): m is ShotMarker => m !== null);

          return {
            markers: mappedMarkers,
          };
        }

        return pluginState;
      },
    },

    // No decorations - markers are invisible
    props: {},
  });
}

/**
 * Add a shot marker at a position.
 */
export function addShotMarker(
  view: EditorView,
  shotId: string,
  sceneId: string,
  position?: number
) {
  const pos = position ?? view.state.selection.from;
  const tr = view.state.tr.setMeta(SHOT_MARKERS_UPDATE_META, {
    type: 'add',
    marker: { shotId, sceneId, position: pos },
  } as ShotMarkersUpdatePayload);
  view.dispatch(tr);
}

/**
 * Remove a shot marker by ID.
 */
export function removeShotMarker(view: EditorView, markerId: string) {
  const tr = view.state.tr.setMeta(SHOT_MARKERS_UPDATE_META, {
    type: 'remove',
    markerId,
  } as ShotMarkersUpdatePayload);
  view.dispatch(tr);
}

/**
 * Remove all markers for a specific shot.
 */
export function removeShotMarkersForShot(view: EditorView, shotId: string) {
  const state = getShotMarkersState(view.state);
  if (!state) return;

  const markersToRemove = state.markers.filter(m => m.shotId === shotId);
  markersToRemove.forEach(marker => {
    removeShotMarker(view, marker.id);
  });
}

/**
 * Set all markers (for initialization from saved data).
 */
export function setShotMarkers(view: EditorView, markers: ShotMarker[]) {
  const tr = view.state.tr.setMeta(SHOT_MARKERS_UPDATE_META, {
    type: 'set',
    markers,
  } as ShotMarkersUpdatePayload);
  view.dispatch(tr);
}

/**
 * Get the current shot markers state.
 */
export function getShotMarkersState(state: EditorState): ShotMarkersState | undefined {
  return shotMarkersPluginKey.getState(state);
}

/**
 * Get markers for a specific scene.
 */
export function getMarkersForScene(state: EditorState, sceneId: string): ShotMarker[] {
  const pluginState = getShotMarkersState(state);
  if (!pluginState) return [];
  return pluginState.markers.filter(m => m.sceneId === sceneId);
}

/**
 * Get marker for a specific shot.
 */
export function getMarkerForShot(state: EditorState, shotId: string): ShotMarker | undefined {
  const pluginState = getShotMarkersState(state);
  if (!pluginState) return undefined;
  return pluginState.markers.find(m => m.shotId === shotId);
}

/**
 * Check if a position has a shot marker nearby (within tolerance).
 */
export function hasMarkerNearPosition(
  state: EditorState,
  position: number,
  tolerance: number = 5
): ShotMarker | undefined {
  const pluginState = getShotMarkersState(state);
  if (!pluginState) return undefined;
  return pluginState.markers.find(
    m => Math.abs(m.position - position) <= tolerance
  );
}
