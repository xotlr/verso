/**
 * Tapestry Auto-Sync Hook
 *
 * Auto-syncs scenes, characters, and locations from the screenplay to the tapestry.
 * Creates and updates nodes with bipartite layout (characters left, scenes right in act lanes).
 */

import { useEffect } from 'react';
import {
  TapestryNode,
  TapestryGroup,
  TapestryState,
  createNode,
  createConnection,
  createGroup,
  getTapestryStorageKey,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_CHARACTER_WIDTH,
  DEFAULT_CHARACTER_HEIGHT,
  NODE_TYPE_COLORS,
  NOTE_COLORS,
} from '@/types/tapestry';
import { safeSetItem } from '@/lib/storage';
import { loadIndexCards } from '@/lib/tapestry';
import type { Scene } from '@/types/screenplay';
import type { CharacterInfo } from '@/hooks/editor/types';

interface UseTapestryAutoSyncOptions {
  screenplayId: string;
  scenes: Scene[];
  characters: CharacterInfo[];
  locations: { id: string; name: string }[];
  resetTrigger: number;
  setState: React.Dispatch<React.SetStateAction<TapestryState>>;
}

/**
 * Auto-syncs screenplay data (scenes, characters, locations) to tapestry nodes.
 * Creates a bipartite layout with characters on the left and scenes on the right,
 * organized in horizontal act lanes.
 */
export function useTapestryAutoSync({
  screenplayId,
  scenes,
  characters,
  locations,
  resetTrigger,
  setState,
}: UseTapestryAutoSyncOptions): void {
  useEffect(() => {
    if (scenes.length === 0 && characters.length === 0 && locations.length === 0) return;

    // Load index card data for enrichment
    const indexCards = loadIndexCards(screenplayId);
    const cardsBySceneId = new Map(indexCards.map(c => [c.sceneId, c]));

    // When resetTrigger changes, ignore existing positions (fresh layout)
    const forceNewLayout = resetTrigger > 0;

    setState(prev => {
      // Get existing linked nodes by type (empty maps if forcing new layout)
      const existingSceneNodes = forceNewLayout ? new Map() : new Map(
        prev.nodes.filter(n => n.sceneId).map(n => [n.sceneId, n])
      );
      const existingCharacterNodes = forceNewLayout ? new Map() : new Map(
        prev.nodes.filter(n => n.characterId).map(n => [n.characterId, n])
      );

      const updatedNodes: TapestryNode[] = [];
      const newGroups: TapestryGroup[] = forceNewLayout ? [] : [...prev.groups];

      // ============================================================================
      // BIPARTITE LAYOUT: Characters LEFT, Scenes RIGHT (in act lanes)
      // ============================================================================

      // Layout constants
      const sceneNodeWidth = DEFAULT_NOTE_WIDTH;
      const sceneNodeHeight = DEFAULT_NOTE_HEIGHT;
      const charNodeWidth = DEFAULT_CHARACTER_WIDTH;
      const charNodeHeight = DEFAULT_CHARACTER_HEIGHT;

      const leftMargin = 60;
      const charColumnWidth = charNodeWidth + 40;  // Character column on left
      const sceneStartX = leftMargin + charColumnWidth + 80;  // Gap between chars and scenes
      const sceneSpacing = sceneNodeWidth + 30;  // Horizontal spacing between scenes
      const actRowSpacing = sceneNodeHeight + 40;  // Vertical spacing between rows in act

      // Group scenes by "act" (every 10 scenes = 1 act)
      const getActNumber = (sceneNum: number) => Math.ceil(sceneNum / 10);
      const scenesByAct = new Map<number, typeof scenes>();
      scenes.forEach(scene => {
        const act = getActNumber(scene.number);
        if (!scenesByAct.has(act)) scenesByAct.set(act, []);
        scenesByAct.get(act)!.push(scene);
      });

      // Sort characters by dialogue count (most active at top)
      const sortedCharacters = [...characters].sort((a, b) => b.dialogueCount - a.dialogueCount);

      // === CHARACTER NODES (left column, sorted by dialogue count) ===
      const charVerticalSpacing = charNodeHeight + 25;
      const charStartY = 60;

      sortedCharacters.forEach((char, i) => {
        const existingNode = existingCharacterNodes.get(char.id);

        if (existingNode) {
          updatedNodes.push({
            ...existingNode,
            type: 'character',
            dialogueCount: char.dialogueCount,
            sceneAppearances: scenes
              .filter(s => s.characters?.includes(char.name))
              .map(s => s.id),
          });
        } else {
          const x = leftMargin;
          const y = charStartY + i * charVerticalSpacing;

          updatedNodes.push(createNode({
            type: 'character',
            x,
            y,
            title: char.name,
            content: `${char.dialogueCount} dialogue${char.dialogueCount !== 1 ? 's' : ''}`,
            characterId: char.id,
            dialogueCount: char.dialogueCount,
            sceneAppearances: scenes
              .filter(s => s.characters?.includes(char.name))
              .map(s => s.id),
            color: NODE_TYPE_COLORS.character,
          }));
        }
      });

      // Calculate character column height for centering scenes (reserved for future use)
      void (sortedCharacters.length * charVerticalSpacing);

      // === SCENE NODES (right side, organized in horizontal act lanes) ===
      // Each act is a horizontal row, scenes flow left-to-right within each act
      const actBounds = new Map<number, { minX: number; minY: number; maxX: number; maxY: number }>();
      let currentActY = charStartY;  // Start scenes aligned with first character

      const sortedActs = Array.from(scenesByAct.keys()).sort((a, b) => a - b);

      sortedActs.forEach((actNum) => {
        const actScenes = scenesByAct.get(actNum)!;
        const actStartY = currentActY;

        // Calculate how many scenes per row (aim for 4-6 per row)
        const scenesPerRow = Math.min(6, Math.max(3, actScenes.length));
        const numRows = Math.ceil(actScenes.length / scenesPerRow);

        actScenes.forEach((scene, i) => {
          const existingNode = existingSceneNodes.get(scene.id);
          const card = cardsBySceneId.get(scene.id);

          if (existingNode) {
            updatedNodes.push({
              ...existingNode,
              type: 'scene',
              title: existingNode.title.startsWith('Scene ')
                ? `Scene ${scene.number}`
                : existingNode.title,
              content: card?.summary && existingNode.content === scene.heading
                ? card.summary
                : existingNode.content || card?.summary || scene.heading,
              color: card?.color || existingNode.color,
              sceneNumber: scene.number,
              timeOfDay: scene.timeOfDay,
            });
          } else {
            // Arrange scenes in rows within act lane
            const col = i % scenesPerRow;
            const row = Math.floor(i / scenesPerRow);
            const x = sceneStartX + col * sceneSpacing;
            const y = actStartY + row * actRowSpacing;

            // Track bounds for this act
            if (!actBounds.has(actNum)) {
              actBounds.set(actNum, { minX: x, minY: y, maxX: x + sceneNodeWidth, maxY: y + sceneNodeHeight });
            } else {
              const bounds = actBounds.get(actNum)!;
              bounds.minX = Math.min(bounds.minX, x);
              bounds.minY = Math.min(bounds.minY, y);
              bounds.maxX = Math.max(bounds.maxX, x + sceneNodeWidth);
              bounds.maxY = Math.max(bounds.maxY, y + sceneNodeHeight);
            }

            updatedNodes.push(createNode({
              type: 'scene',
              x,
              y,
              title: `Scene ${scene.number}`,
              content: card?.summary || scene.heading,
              sceneId: scene.id,
              sceneNumber: scene.number,
              timeOfDay: scene.timeOfDay,
              color: card?.color || NODE_TYPE_COLORS.scene,
            }));
          }
        });

        // Move Y position for next act (each act gets its own horizontal lane)
        currentActY += numRows * actRowSpacing + 60; // Gap between acts
      });

      // Create auto-groups for each act (only if no existing groups)
      if (prev.groups.length === 0 && scenesByAct.size > 1) {
        const actGroupIds = new Map<number, string>();

        // First pass: create groups and store their IDs
        actBounds.forEach((bounds, actNum) => {
          const padding = 20;
          const group = createGroup({
            x: bounds.minX - padding,
            y: bounds.minY - 40, // Room for header
            width: bounds.maxX - bounds.minX + padding * 2,
            height: bounds.maxY - bounds.minY + padding + 40,
            title: `Act ${actNum}`,
            color: NOTE_COLORS[(actNum - 1) % NOTE_COLORS.length],
          });
          actGroupIds.set(actNum, group.id);
          newGroups.push(group);
        });

        // Second pass: assign groupId to scene nodes based on their act
        updatedNodes.forEach(node => {
          if (node.type === 'scene' && node.sceneNumber) {
            const actNum = getActNumber(node.sceneNumber);
            const groupId = actGroupIds.get(actNum);
            if (groupId) {
              node.groupId = groupId;
            }
          }
        });
      }

      // Keep user-created nodes (notes, items, etc. that weren't auto-imported)
      const userNodes = prev.nodes.filter(n =>
        !n.sceneId && !n.characterId && (n.type === 'note' || n.type === 'item')
      );

      const newNodes = [...userNodes, ...updatedNodes];

      // === AUTO-CREATE CONNECTIONS ===
      // Create "appears_in" connections between characters and their scenes
      const existingConnectionKeys = new Set(
        prev.connections.map(c => `${c.sourceId}-${c.targetId}`)
      );
      const newConnections = [...prev.connections];

      // Build maps for quick lookup
      const nodesBySceneId = new Map(
        newNodes.filter(n => n.sceneId).map(n => [n.sceneId, n])
      );

      // Character → Scene connections
      newNodes.filter(n => n.type === 'character' && n.sceneAppearances).forEach(charNode => {
        charNode.sceneAppearances?.forEach(sceneId => {
          const sceneNode = nodesBySceneId.get(sceneId);
          if (sceneNode) {
            const key = `${charNode.id}-${sceneNode.id}`;
            const reverseKey = `${sceneNode.id}-${charNode.id}`;
            if (!existingConnectionKeys.has(key) && !existingConnectionKeys.has(reverseKey)) {
              newConnections.push(createConnection(charNode.id, sceneNode.id, 'appears_in', {
                label: 'appears in',
                directed: true,
              }));
              existingConnectionKeys.add(key);
            }
          }
        });
      });

      // Only update if there are changes
      const hasNodeChanges = newNodes.length !== prev.nodes.length ||
        newNodes.some((n, i) => {
          const oldNode = prev.nodes[i];
          return !oldNode || n.id !== oldNode.id || n.content !== oldNode.content;
        });
      const hasConnectionChanges = newConnections.length !== prev.connections.length;
      const hasGroupChanges = newGroups.length !== prev.groups.length;

      if (!hasNodeChanges && !hasConnectionChanges && !hasGroupChanges) return prev;

      const newState = { ...prev, nodes: newNodes, connections: newConnections, groups: newGroups };
      const storageKey = getTapestryStorageKey(screenplayId);
      safeSetItem(storageKey, newState);
      return newState;
    });
  }, [scenes, characters, locations, screenplayId, resetTrigger, setState]);
}
