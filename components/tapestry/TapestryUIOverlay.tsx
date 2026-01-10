'use client';

import { useCallback } from 'react';
import type { TapestryNode, TapestryConnection, TapestryGroup, TapestryState, ConnectionType } from '@/types/tapestry';
import { CONNECTION_TYPE_LABELS } from '@/types/tapestry';
import { NoteEditorDialog } from './note-editor-dialog';
import { ContextMenu, type ContextMenuItem } from './context-menu';
import { CharacterProfilePanel } from './character-profile-panel';
import { Input } from '@/components/ui/input';

interface EditingConnectionState {
  id: string;
  x: number;
  y: number;
  label: string;
  type: ConnectionType;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
  groupId?: string;
}

interface TapestryUIOverlayProps {
  // State
  state: TapestryState;
  selectedNodes: Set<string>;
  isConnecting: boolean;

  // Editing state
  editingNode: TapestryNode | null;
  setEditingNode: (node: TapestryNode | null) => void;
  editingConnection: EditingConnectionState | null;
  setEditingConnection: (conn: EditingConnectionState | null) => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (menu: ContextMenuState | null) => void;
  profileCharacter: TapestryNode | null;
  setProfileCharacter: (node: TapestryNode | null) => void;

  // Handlers
  onSaveNote: (node: TapestryNode) => void;
  onDeleteNote: (nodeId: string) => void;
  onSaveConnectionLabel: (connectionId: string, label: string) => void;
  onSaveConnectionType: (connectionId: string, type: ConnectionType) => void;
  onGroupSelected: () => void;
  onAnimateCollapse: (groupId: string, toCollapsed: boolean) => void;
  onNavigateToScene?: (sceneId: string) => void;

  // State setters for context menu actions
  setState: (updater: (prev: TapestryState) => TapestryState) => void;
  saveState: (newState: TapestryState) => void;
  setSelectedNodes: (nodes: Set<string>) => void;
  setIsConnecting: (connecting: boolean) => void;
  setConnectingFrom: (nodeId: string | null) => void;
}

/**
 * UI overlay components for Tapestry: dialogs, context menus, connection editor.
 * Extracted from main tapestry.tsx to reduce component size.
 */
export function TapestryUIOverlay({
  state,
  selectedNodes,
  isConnecting,
  editingNode,
  setEditingNode,
  editingConnection,
  setEditingConnection,
  contextMenu,
  setContextMenu,
  profileCharacter,
  setProfileCharacter,
  onSaveNote,
  onDeleteNote,
  onSaveConnectionLabel,
  onSaveConnectionType,
  onGroupSelected,
  onAnimateCollapse,
  onNavigateToScene,
  setState,
  saveState,
  setSelectedNodes,
  setIsConnecting,
  setConnectingFrom,
}: TapestryUIOverlayProps) {
  // Handle delete from dialog
  const handleDeleteNoteFromDialog = useCallback((nodeId: string) => {
    onDeleteNote(nodeId);
    setSelectedNodes(new Set());
    setEditingNode(null);
  }, [onDeleteNote, setSelectedNodes, setEditingNode]);

  // Build context menu items for node
  const getNodeContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu?.nodeId) return [];

    const items: ContextMenuItem[] = [];

    // Group Selected option (only when multiple nodes selected)
    if (selectedNodes.size >= 2) {
      items.push({
        label: `Group Selected (${selectedNodes.size})`,
        action: onGroupSelected,
      });
      items.push({ label: '', action: () => {}, separator: true });
    }

    items.push({
      label: 'Edit',
      action: () => {
        const node = state.nodes.find(n => n.id === contextMenu.nodeId);
        if (node) setEditingNode(node);
      },
    });

    items.push({
      label: 'Connect',
      action: () => {
        if (contextMenu.nodeId) {
          setSelectedNodes(new Set([contextMenu.nodeId]));
          setIsConnecting(true);
          setConnectingFrom(contextMenu.nodeId);
        }
      },
    });

    items.push({ label: '', action: () => {}, separator: true });

    items.push({
      label: 'Delete',
      action: () => {
        if (contextMenu.nodeId) {
          const nodeId = contextMenu.nodeId;
          setState((prev: TapestryState) => {
            const newState: TapestryState = {
              ...prev,
              nodes: prev.nodes.filter((n: TapestryNode) => n.id !== nodeId),
              connections: prev.connections.filter(
                (c: TapestryConnection) => c.sourceId !== nodeId && c.targetId !== nodeId
              ),
            };
            saveState(newState);
            return newState;
          });
          setSelectedNodes(new Set());
        }
      },
      destructive: true,
    });

    return items;
  }, [contextMenu, selectedNodes, state.nodes, onGroupSelected, setEditingNode, setSelectedNodes, setIsConnecting, setConnectingFrom, setState, saveState]);

  // Build context menu items for group
  const getGroupContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu?.groupId) return [];

    const group = state.groups.find((g: TapestryGroup) => g.id === contextMenu.groupId);

    return [
      {
        label: 'Rename',
        action: () => {
          if (group) {
            const newTitle = window.prompt('Group title:', group.title);
            if (newTitle && newTitle !== group.title) {
              setState((prev: TapestryState) => {
                const newState: TapestryState = {
                  ...prev,
                  groups: prev.groups.map((g: TapestryGroup) =>
                    g.id === contextMenu.groupId ? { ...g, title: newTitle } : g
                  ),
                };
                saveState(newState);
                return newState;
              });
            }
          }
        },
      },
      {
        label: group?.collapsed ? 'Expand' : 'Collapse',
        action: () => {
          if (contextMenu.groupId) {
            onAnimateCollapse(contextMenu.groupId, !group?.collapsed);
          }
        },
      },
      { label: '', action: () => {}, separator: true },
      {
        label: 'Delete Group',
        action: () => {
          if (contextMenu.groupId) {
            const groupId = contextMenu.groupId;
            setState((prev: TapestryState) => {
              const newState: TapestryState = {
                ...prev,
                groups: prev.groups.filter((g: TapestryGroup) => g.id !== groupId),
                nodes: prev.nodes.map((n: TapestryNode) =>
                  n.groupId === groupId ? { ...n, groupId: undefined } : n
                ),
              };
              saveState(newState);
              return newState;
            });
          }
        },
        destructive: true,
      },
    ];
  }, [contextMenu, state.groups, setState, saveState, onAnimateCollapse]);

  return (
    <>
      {/* Connecting mode indicator */}
      {isConnecting && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm z-10">
          Click another node to connect, or click canvas to cancel
        </div>
      )}

      {/* Character Profile Panel */}
      {profileCharacter && (
        <CharacterProfilePanel
          character={profileCharacter}
          connections={state.connections}
          allNodes={state.nodes}
          onClose={() => setProfileCharacter(null)}
          onUpdate={(updated) => {
            onSaveNote(updated);
            setProfileCharacter(updated);
          }}
          onNavigateToScene={onNavigateToScene}
        />
      )}

      {/* Node Editor Dialog */}
      <NoteEditorDialog
        note={editingNode}
        open={!!editingNode}
        onOpenChange={(open) => !open && setEditingNode(null)}
        onSave={onSaveNote}
        onDelete={handleDeleteNoteFromDialog}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={
            contextMenu.nodeId
              ? getNodeContextMenuItems()
              : contextMenu.groupId
                ? getGroupContextMenuItems()
                : []
          }
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Connection Label Editor */}
      {editingConnection && (
        <div
          className="fixed z-50 pointer-events-auto"
          style={{
            left: editingConnection.x - 100,
            top: editingConnection.y - 20,
          }}
        >
          <div className="bg-popover border border-border rounded-xl shadow-lg p-2 pointer-events-auto space-y-2">
            {/* Connection Type Selector */}
            <select
              value={editingConnection.type}
              onChange={(e) => onSaveConnectionType(editingConnection.id, e.target.value as ConnectionType)}
              className="h-8 w-full text-sm bg-background border border-border/50 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(CONNECTION_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>

            {/* Label Input */}
            <Input
              autoFocus
              defaultValue={editingConnection.label}
              placeholder="Add label..."
              className="h-8 w-48 text-sm bg-background border-border/50 rounded-lg handwritten text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveConnectionLabel(editingConnection.id, (e.target as HTMLInputElement).value);
                } else if (e.key === 'Escape') {
                  setEditingConnection(null);
                }
              }}
              onBlur={(e) => {
                onSaveConnectionLabel(editingConnection.id, e.target.value);
              }}
            />
            <p className="text-[10px] text-muted-foreground px-1">
              Enter to save · Esc to cancel
            </p>
          </div>
        </div>
      )}
    </>
  );
}
