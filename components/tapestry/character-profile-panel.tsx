'use client';

import { useCallback, useState, useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { X, Film, Users, FileText, Pin, PinOff, Edit3, User } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { TapestryNode, TapestryConnection } from '@/types/tapestry';

const panelVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.15 } },
};

interface CharacterProfilePanelProps {
  character: TapestryNode;
  connections: TapestryConnection[];
  allNodes: TapestryNode[];
  onClose: () => void;
  onUpdate: (updated: TapestryNode) => void;
  onNavigateToScene?: (sceneId: string) => void;
}

type PanelSection = 'overview' | 'relationships' | 'scenes' | 'notes';

/**
 * Character Profile Panel - Procreate-style floating panel
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
  const [activeSection, setActiveSection] = useState<PanelSection>('overview');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingArc, setIsEditingArc] = useState(false);
  const [notes, setNotes] = useState(character.notes || '');
  const [arcSummary, setArcSummary] = useState(character.arcSummary || '');

  // ============================================================================
  // PERFORMANCE: All computed values memoized to prevent unnecessary recalculations
  // ============================================================================

  // Get scenes this character appears in - memoized
  const characterScenes = useMemo(() =>
    allNodes.filter(
      n => n.type === 'scene' && character.sceneAppearances?.includes(n.sceneId || '')
    ),
    [allNodes, character.sceneAppearances]
  );

  // Get relationships (connections to other characters) - memoized
  const characterConnections = useMemo(() =>
    connections.filter(
      c => (c.sourceId === character.id || c.targetId === character.id) &&
           c.type === 'relationship'
    ),
    [connections, character.id]
  );

  // Build node lookup map for O(1) access - memoized
  const nodeById = useMemo(() =>
    new Map(allNodes.map(n => [n.id, n])),
    [allNodes]
  );

  // Get related characters using O(1) lookups - memoized
  const relatedCharacters = useMemo(() =>
    characterConnections.map(conn => {
      const otherId = conn.sourceId === character.id ? conn.targetId : conn.sourceId;
      const otherChar = nodeById.get(otherId);
      return {
        connection: conn,
        character: otherChar,
      };
    }).filter(r => r.character),
    [characterConnections, character.id, nodeById]
  );

  // Get initials for avatar - memoized
  const initials = useMemo(() => getInitials(character.title), [character.title]);

  // Calculate dialogue percentage (compared to highest character) - memoized
  const dialoguePercentage = useMemo(() => {
    let maxDialogue = 1;
    for (const node of allNodes) {
      if (node.type === 'character' && (node.dialogueCount || 0) > maxDialogue) {
        maxDialogue = node.dialogueCount || 0;
      }
    }
    return Math.round(((character.dialogueCount || 0) / maxDialogue) * 100);
  }, [allNodes, character.dialogueCount]);

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

  const sections = [
    { id: 'overview' as const, icon: User, label: 'Info' },
    { id: 'relationships' as const, icon: Users, label: 'Relations' },
    { id: 'scenes' as const, icon: Film, label: 'Scenes' },
    { id: 'notes' as const, icon: FileText, label: 'Notes' },
  ];

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute right-2 top-2 bottom-2 w-72 bg-sidebar border border-border rounded-xl shadow-lg z-30 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground flex-shrink-0"
        >
          {initials}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-sm truncate">{character.title}</h2>
        </div>

        {/* Actions */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", character.pinned && "text-primary")}
          onClick={handleTogglePin}
          title={character.pinned ? "Unpin" : "Pin"}
        >
          {character.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tab Navigation - inside content area */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-muted/50">
        {sections.map((section) => (
          <button
            key={section.id}
            className={cn(
              "h-7 px-2 text-xs rounded-md flex items-center gap-1.5 transition-colors",
              activeSection === section.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            onClick={() => setActiveSection(section.id)}
          >
            <section.icon className="h-3 w-3" />
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Overview Tab */}
          {activeSection === 'overview' && (
            <div className="space-y-3">
              {/* Stats Row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span><strong>{character.dialogueCount || 0}</strong> lines</span>
                  <span><strong>{characterScenes.length}</strong> scenes</span>
                  <span><strong>{relatedCharacters.length}</strong> relations</span>
                </div>
                <span className="text-muted-foreground">{dialoguePercentage}%</span>
              </div>

              {/* Dialogue Progress */}
              <div className="w-full bg-muted rounded h-1">
                <div
                  className="h-1 rounded bg-foreground/40 transition-all"
                  style={{ width: `${dialoguePercentage}%` }}
                />
              </div>

              {/* Character Arc */}
              <div className="bg-muted/30 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Character Arc</span>
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
                      className="w-full h-20 p-2 text-sm bg-background border border-border/50 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveArc}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setArcSummary(character.arcSummary || ''); setIsEditingArc(false); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className={cn("text-sm", !arcSummary && "text-muted-foreground italic")}>
                    {arcSummary || 'No arc summary yet...'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Relationships Tab */}
          {activeSection === 'relationships' && (
            <div className="space-y-2">
              {relatedCharacters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No relationships defined
                </p>
              ) : (
                relatedCharacters.map(({ connection, character: relChar }) => (
                  <div
                    key={connection.id}
                    className="bg-muted/30 rounded-lg p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold bg-muted text-muted-foreground flex-shrink-0"
                      >
                        {getInitials(relChar?.title)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{relChar?.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {connection.label || 'Connected'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Scenes Tab */}
          {activeSection === 'scenes' && (
            <div className="space-y-2">
              {characterScenes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No scene appearances
                </p>
              ) : (
                characterScenes.map(scene => (
                  <button
                    key={scene.id}
                    onClick={() => scene.sceneId && onNavigateToScene?.(scene.sceneId)}
                    className="w-full text-left bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {scene.sceneNumber || '?'}
                      </span>
                      <span className="text-sm truncate flex-1">
                        {scene.content?.slice(0, 40) || scene.title}...
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeSection === 'notes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</span>
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
                    className="w-full h-40 p-3 text-sm bg-background border border-border/50 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleSaveNotes}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setNotes(character.notes || ''); setIsEditingNotes(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-3 min-h-[120px]">
                  <p className={cn("text-sm whitespace-pre-wrap", !notes && "text-muted-foreground italic")}>
                    {notes || 'No notes yet. Click the edit button to add notes about this character.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
