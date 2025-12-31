'use client';

import { useCallback, useState } from 'react';
import { X, MessageSquare, Film, Users, FileText, Pin, PinOff, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TapestryNode, TapestryConnection } from '@/types/tapestry';

interface CharacterProfilePanelProps {
  character: TapestryNode;
  connections: TapestryConnection[];
  allNodes: TapestryNode[];
  onClose: () => void;
  onUpdate: (updated: TapestryNode) => void;
  onNavigateToScene?: (sceneId: string) => void;
}

/**
 * Character Profile Panel - "Case File" style character information display
 * Shows dialogue count, scenes, relationships, and allows editing notes/arc summary
 */
export function CharacterProfilePanel({
  character,
  connections,
  allNodes,
  onClose,
  onUpdate,
  onNavigateToScene,
}: CharacterProfilePanelProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingArc, setIsEditingArc] = useState(false);
  const [notes, setNotes] = useState(character.notes || '');
  const [arcSummary, setArcSummary] = useState(character.arcSummary || '');

  // Get scenes this character appears in
  const characterScenes = allNodes.filter(
    n => n.type === 'scene' && character.sceneAppearances?.includes(n.sceneId || '')
  );

  // Get relationships (connections to other characters)
  const characterConnections = connections.filter(
    c => (c.sourceId === character.id || c.targetId === character.id) &&
         c.type === 'relationship'
  );

  const relatedCharacters = characterConnections.map(conn => {
    const otherId = conn.sourceId === character.id ? conn.targetId : conn.sourceId;
    const otherChar = allNodes.find(n => n.id === otherId);
    return {
      connection: conn,
      character: otherChar,
    };
  }).filter(r => r.character);

  // Get initials for avatar
  const initials = character.title
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const handleTogglePin = useCallback(() => {
    onUpdate({ ...character, pinned: !character.pinned });
  }, [character, onUpdate]);

  const handleSaveNotes = useCallback(() => {
    onUpdate({ ...character, notes });
    setIsEditingNotes(false);
  }, [character, notes, onUpdate]);

  const handleSaveArc = useCallback(() => {
    onUpdate({ ...character, arcSummary });
    setIsEditingArc(false);
  }, [character, arcSummary, onUpdate]);

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl z-30 flex flex-col overflow-hidden">
      {/* Header - Polaroid style */}
      <div className="relative bg-muted/30 p-4 border-b border-border">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Pin button */}
        <button
          onClick={handleTogglePin}
          className={cn(
            "absolute top-2 right-10 p-1 rounded transition-colors",
            character.pinned ? "text-primary bg-primary/10" : "hover:bg-muted"
          )}
          title={character.pinned ? "Unpin from canvas" : "Pin to canvas"}
        >
          {character.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        </button>

        {/* Polaroid-style portrait */}
        <div className="flex flex-col items-center">
          <div
            className="w-24 h-28 bg-white rounded shadow-md p-1 mb-2 transform -rotate-2"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            {character.portrait ? (
              <img
                src={character.portrait}
                alt={character.title}
                className="w-full h-20 object-cover rounded-sm"
              />
            ) : (
              <div
                className="w-full h-20 rounded-sm flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: character.color }}
              >
                {initials}
              </div>
            )}
            {/* Handwritten name */}
            <div
              className="text-center mt-1 text-sm text-gray-700 truncate px-1"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {character.title}
            </div>
          </div>

          {/* Stats badges */}
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-medium">{character.dialogueCount || 0}</span>
              <span>lines</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Film className="w-3.5 h-3.5" />
              <span className="font-medium">{characterScenes.length}</span>
              <span>scenes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Arc Summary Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Character Arc
            </h3>
            <button
              onClick={() => setIsEditingArc(!isEditingArc)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          {isEditingArc ? (
            <div className="space-y-2">
              <textarea
                value={arcSummary}
                onChange={(e) => setArcSummary(e.target.value)}
                placeholder="Describe this character's arc..."
                className="w-full h-24 p-2 text-sm bg-muted/50 border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveArc}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => { setArcSummary(character.arcSummary || ''); setIsEditingArc(false); }}
                  className="px-3 py-1 text-xs bg-muted rounded hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm",
                arcSummary ? "text-foreground" : "text-muted-foreground italic"
              )}
              style={{ fontFamily: "'Caveat', cursive", fontSize: '16px', lineHeight: '1.4' }}
            >
              {arcSummary || 'No arc summary yet...'}
            </p>
          )}
        </div>

        {/* Relationships Section */}
        {relatedCharacters.length > 0 && (
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
              <Users className="w-3.5 h-3.5" />
              Relationships
            </h3>
            <div className="space-y-2">
              {relatedCharacters.map(({ connection, character: relChar }) => (
                <div
                  key={connection.id}
                  className="flex items-center gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                    style={{ backgroundColor: relChar?.color }}
                  >
                    {relChar?.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{relChar?.title}</div>
                    <div
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      {connection.label || 'Connected'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenes Section */}
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
            <Film className="w-3.5 h-3.5" />
            Appears In ({characterScenes.length} scenes)
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {characterScenes.length > 0 ? (
              characterScenes.map(scene => (
                <button
                  key={scene.id}
                  onClick={() => scene.sceneId && onNavigateToScene?.(scene.sceneId)}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted/50 transition-colors truncate"
                >
                  <span className="font-medium">Scene {scene.sceneNumber}</span>
                  <span className="text-muted-foreground ml-2">{scene.content?.slice(0, 30)}...</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">No scene appearances</p>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Notes
            </h3>
            <button
              onClick={() => setIsEditingNotes(!isEditingNotes)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this character..."
                className="w-full h-32 p-2 text-sm bg-muted/50 border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '16px' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => { setNotes(character.notes || ''); setIsEditingNotes(false); }}
                  className="px-3 py-1 text-xs bg-muted rounded hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm whitespace-pre-wrap",
                notes ? "text-foreground" : "text-muted-foreground italic"
              )}
              style={{ fontFamily: "'Caveat', cursive", fontSize: '16px', lineHeight: '1.4' }}
            >
              {notes || 'No notes yet...'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
