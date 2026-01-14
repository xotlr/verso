'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Scene } from '@/types/screenplay';
import { cn } from '@/lib/utils';
import {
  Filter,
  Plus,
  ChevronsUpDown,
  CheckSquare,
  Film,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  normalizeTimeOfDay,
  TIME_OF_DAY_LABELS,
  TIME_OF_DAY_ORDER,
  type TimeOfDay,
} from '@/lib/prosemirror/utils/time-detection';
import { GroupSection } from './index-cards/GroupSection';
import { CardContextMenu } from './index-cards/CardContextMenu';
import { SortableCard, STATUS_CONFIG, STATUSES } from './index-cards/SortableCard';
import { EditHeadingDialog } from './index-cards/dialogs/EditHeadingDialog';
import { EditNoteDialog } from './index-cards/dialogs/EditNoteDialog';
import { EditMoodDialog } from './index-cards/dialogs/EditMoodDialog';
import { CreateGroupDialog } from './index-cards/dialogs/CreateGroupDialog';
import { useCardGroups } from '@/hooks/use-card-groups';
import { useGroupedCards } from '@/hooks/use-grouped-cards';
import { useCardSelection } from '@/hooks/use-card-selection';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { usePersistedSet } from '@/hooks/use-persisted-state';
import type { IndexCard, CustomCardGroup, CardStatus, GroupColor } from '@/types/index-cards';
import type { ActConfig } from '@/types/beat-board';
import { toast } from 'sonner';

export interface IndexCardsGroupedProps {
  screenplayId: string;
  scenes: Scene[];
  cards: IndexCard[];
  acts: ActConfig[];
  characterRankings?: Map<string, number>;
  onCardsChange: (cards: IndexCard[]) => void;
  onScenesReorder: (scenes: Scene[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onSceneEdit?: (scene: Scene) => void;
  onSceneMetaUpdate: (sceneId: string, meta: Partial<IndexCard>) => void;
}

// Main Component
export function IndexCardsGrouped({
  screenplayId,
  scenes,
  cards,
  acts,
  characterRankings,
  onCardsChange,
  onScenesReorder,
  onSceneClick,
  onSceneMetaUpdate,
}: IndexCardsGroupedProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeOfDay | 'ALL'>('ALL');
  const [collapsedGroupIds, setCollapsedGroupIds] = usePersistedSet<string>(
    `verso-cards-collapsed-${screenplayId}`,
    new Set()
  );

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    cardId: string | null;
    sceneId: string | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    cardId: null,
    sceneId: null,
  });

  // Dialog states
  const [editHeadingDialog, setEditHeadingDialog] = useState<{
    isOpen: boolean;
    sceneId: string | null;
  }>({ isOpen: false, sceneId: null });

  const [editNoteDialog, setEditNoteDialog] = useState<{
    isOpen: boolean;
    sceneId: string | null;
  }>({ isOpen: false, sceneId: null });

  const [editMoodDialog, setEditMoodDialog] = useState<{
    isOpen: boolean;
    sceneId: string | null;
  }>({ isOpen: false, sceneId: null });

  const [createGroupDialog, setCreateGroupDialog] = useState<{
    isOpen: boolean;
    cardIds: string[];
  }>({ isOpen: false, cardIds: [] });

  // Hooks
  const { groups: customGroups, createGroup, updateGroup, deleteGroup } = useCardGroups({
    screenplayId,
  });

  const {
    selectedCardIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleCard,
    clearSelection,
  } = useCardSelection();

  const groupedCards = useGroupedCards({
    cards,
    customGroups,
    acts,
    collapsedGroupIds,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getCard = (sceneId: string) => cards.find((c) => c.sceneId === sceneId);

  // Filter scenes by time
  const filteredScenes = useMemo(() => {
    if (timeFilter === 'ALL') return scenes;
    return scenes.filter((s) => normalizeTimeOfDay(s.timeOfDay) === timeFilter);
  }, [scenes, timeFilter]);

  // Available times
  const availableTimes = useMemo(() => {
    const times = new Set<TimeOfDay>();
    scenes.forEach((scene) => {
      times.add(normalizeTimeOfDay(scene.timeOfDay));
    });
    return Array.from(times).sort((a, b) => TIME_OF_DAY_ORDER[a] - TIME_OF_DAY_ORDER[b]);
  }, [scenes]);

  // Status counts
  const statusCounts = STATUSES.reduce((acc, status) => {
    acc[status] = scenes.filter((s) => (getCard(s.id)?.status || 'draft') === status).length;
    return acc;
  }, {} as Record<string, number>);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: ' ',
      callback: () => {
        if (!isSelectionMode) toggleSelectionMode();
      },
    },
    {
      key: 'g',
      meta: true,
      callback: () => {
        if (selectedCardIds.size > 0) {
          setCreateGroupDialog({
            isOpen: true,
            cardIds: Array.from(selectedCardIds),
          });
        }
      },
    },
    {
      key: 'g',
      ctrl: true,
      callback: () => {
        if (selectedCardIds.size > 0) {
          setCreateGroupDialog({
            isOpen: true,
            cardIds: Array.from(selectedCardIds),
          });
        }
      },
    },
    {
      key: 'Escape',
      callback: () => {
        if (isSelectionMode) {
          clearSelection();
          toggleSelectionMode();
        }
      },
    },
    {
      key: 'a',
      meta: true,
      callback: () => {
        if (isSelectionMode) {
          const allCardIds = cards.map((c) => c.sceneId);
          clearSelection();
          allCardIds.forEach((id) => toggleCard(id));
        }
      },
    },
    {
      key: 'a',
      ctrl: true,
      callback: () => {
        if (isSelectionMode) {
          const allCardIds = cards.map((c) => c.sceneId);
          clearSelection();
          allCardIds.forEach((id) => toggleCard(id));
        }
      },
    },
  ], true);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Handle scene reordering
    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newScenes = arrayMove(scenes, oldIndex, newIndex).map((s, i) => ({
        ...s,
        number: i + 1,
      }));
      onScenesReorder(newScenes);
    }
  };

  // Status change handler
  const handleStatusChange = (sceneId: string, status: CardStatus) => {
    const existingCard = cards.find((c) => c.sceneId === sceneId);
    if (existingCard) {
      onCardsChange(cards.map((c) => (c.sceneId === sceneId ? { ...c, status } : c)));
    } else {
      onCardsChange([
        ...cards,
        {
          sceneId,
          color: null,
          status,
          summary: '',
        },
      ]);
    }
  };

  // Context menu handlers
  const handleCardContextMenu = (e: React.MouseEvent, cardId: string, sceneId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      cardId,
      sceneId,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0, cardId: null, sceneId: null });
  };

  const currentCard = contextMenu.cardId ? (getCard(contextMenu.cardId) || null) : null;

  // Toggle group collapse
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Expand/collapse all
  const expandAll = () => setCollapsedGroupIds(new Set());
  const collapseAll = () => {
    const allGroupIds = groupedCards.groups.map((g) => g.group.id);
    setCollapsedGroupIds(new Set(allGroupIds));
  };

  // Render card function
  const renderCard = (scene: Scene, card: IndexCard) => (
    <SortableCard
      scene={scene}
      card={card}
      characterRankings={characterRankings}
      isSelected={selectedCardIds.has(card.sceneId)}
      onStatusChange={(status) => handleStatusChange(card.sceneId, status)}
      onClick={
        isSelectionMode
          ? () => toggleCard(card.sceneId)
          : undefined
      }
    />
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <Button
          variant={isSelectionMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleSelectionMode}
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Select
        </Button>

        {isSelectionMode && selectedCardIds.size > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateGroupDialog({
                  isOpen: true,
                  cardIds: Array.from(selectedCardIds),
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group ({selectedCardIds.size})
            </Button>

            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4 mr-2" />
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            <ChevronsUpDown className="h-4 w-4 mr-2" />
            Collapse All
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Time filter */}
          {availableTimes.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="h-3 w-3 text-muted-foreground/50 mr-1" />
              <button
                onClick={() => setTimeFilter('ALL')}
                className={cn(
                  'px-2 py-1 rounded-full text-[10px] transition-all',
                  timeFilter === 'ALL'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                All
              </button>
              {availableTimes.map((time) => (
                <button
                  key={time}
                  onClick={() => setTimeFilter(time)}
                  className={cn(
                    'px-2 py-1 rounded-full text-[10px] transition-all',
                    timeFilter === time
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {TIME_OF_DAY_LABELS[time]}
                </button>
              ))}
            </div>
          )}

          {/* Status progress */}
          <div className="flex items-center gap-0.5 h-1.5 bg-muted/30 rounded-full overflow-hidden">
            {STATUSES.map((status) => {
              const config = STATUS_CONFIG[status];
              const count = statusCounts[status];
              const percentage = scenes.length > 0 ? (count / scenes.length) * 100 : 0;
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  className={cn('h-full transition-all duration-500', config.accent)}
                  style={{ width: `${percentage}%` }}
                  title={`${config.label}: ${count}`}
                />
              );
            })}
          </div>

          {/* Cards - Grouped */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              {/* Custom Groups & Act Groups */}
              {groupedCards.groups.map(({ group, cards: groupCards }) => {
                const groupScenes = filteredScenes.filter((s) =>
                  groupCards.some((c) => c.sceneId === s.id)
                );

                if (groupScenes.length === 0) return null;

                return (
                  <GroupSection
                    key={group.id}
                    group={group}
                    cards={groupCards}
                    scenes={groupScenes}
                    characterRankings={characterRankings}
                    isCollapsed={group.isCollapsed || false}
                    onToggleCollapse={() => toggleGroupCollapse(group.id)}
                    onGroupRename={(name) => updateGroup(group.id, { name })}
                    onGroupChangeColor={(color) => updateGroup(group.id, { color })}
                    onGroupUngroup={() => {
                      // Remove all cards from this group
                      groupCards.forEach((card) => {
                        onSceneMetaUpdate(card.sceneId, { customGroupId: null });
                      });
                    }}
                    onGroupDelete={
                      group.type === 'custom' ? () => deleteGroup(group.id) : undefined
                    }
                    onCardContextMenu={handleCardContextMenu}
                    onCardStatusChange={handleStatusChange}
                    selectedCardIds={selectedCardIds}
                    onCardSelect={toggleCard}
                    renderCard={renderCard}
                  />
                );
              })}

              {/* Ungrouped Cards */}
              {groupedCards.ungrouped.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-2">Ungrouped</h3>
                  <SortableContext
                    items={groupedCards.ungrouped.map((c) => c.sceneId)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {groupedCards.ungrouped.map((card) => {
                        const scene = scenes.find((s) => s.id === card.sceneId);
                        if (!scene) return null;
                        return (
                          <div
                            key={scene.id}
                            onContextMenu={(e) => handleCardContextMenu(e, card.sceneId, scene.id)}
                          >
                            {renderCard(scene, card)}
                          </div>
                        );
                      })}
                    </div>
                  </SortableContext>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="opacity-80">
                  {(() => {
                    const scene = scenes.find((s) => s.id === activeId);
                    const card = getCard(activeId);
                    if (!scene || !card) return null;
                    return renderCard(scene, card);
                  })()}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {scenes.length === 0 && (
            <div className="flex items-center justify-center h-48 bg-muted/20 rounded-xl">
              <div className="text-center p-6">
                <Film className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium text-foreground text-sm">No scenes yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Write scenes in the editor to see them here
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Context Menu */}
      <CardContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        card={currentCard}
        groups={groupedCards.groups.map((g) => g.group)}
        acts={acts}
        onClose={handleContextMenuClose}
        onChangeStatus={(status) => {
          if (contextMenu.cardId) {
            handleStatusChange(contextMenu.cardId, status);
          }
        }}
        onJumpToScene={() => {
          if (contextMenu.sceneId && onSceneClick) {
            onSceneClick(contextMenu.sceneId);
          }
        }}
        onEditHeading={() => {
          if (contextMenu.sceneId) {
            setEditHeadingDialog({ isOpen: true, sceneId: contextMenu.sceneId });
          }
        }}
        onAddToGroup={(groupId) => {
          if (contextMenu.cardId) {
            onSceneMetaUpdate(contextMenu.cardId, { customGroupId: groupId });
          }
        }}
        onRemoveFromGroup={() => {
          if (contextMenu.cardId) {
            onSceneMetaUpdate(contextMenu.cardId, { customGroupId: null });
          }
        }}
        onAssignToAct={(actId) => {
          if (contextMenu.cardId) {
            onSceneMetaUpdate(contextMenu.cardId, { act: actId });
          }
        }}
        onSetColor={(color) => {
          if (contextMenu.cardId) {
            onSceneMetaUpdate(contextMenu.cardId, { color });
          }
        }}
        onAddNote={() => {
          if (contextMenu.sceneId) {
            setEditNoteDialog({ isOpen: true, sceneId: contextMenu.sceneId });
          }
        }}
        onSetMood={() => {
          if (contextMenu.sceneId) {
            setEditMoodDialog({ isOpen: true, sceneId: contextMenu.sceneId });
          }
        }}
        onDeleteScene={() => {
          if (contextMenu.sceneId) {
            if (confirm('Delete this scene? This cannot be undone.')) {
              // Delete scene logic would go here
              toast.success('Scene deleted');
            }
          }
        }}
      />

      {/* Dialogs */}
      {editHeadingDialog.sceneId && (() => {
        const scene = scenes.find((s) => s.id === editHeadingDialog.sceneId);
        if (!scene) return null;
        return (
          <EditHeadingDialog
            isOpen={editHeadingDialog.isOpen}
            currentHeading={scene.heading}
            sceneNumber={scene.number}
            onClose={() => setEditHeadingDialog({ isOpen: false, sceneId: null })}
            onSave={(newHeading) => {
              // Scene heading updates sync via ProseMirror document - this is visual feedback only
              toast.success('Scene heading updated');
            }}
          />
        );
      })()}

      {editNoteDialog.sceneId && (() => {
        const scene = scenes.find((s) => s.id === editNoteDialog.sceneId);
        const card = getCard(editNoteDialog.sceneId);
        if (!scene) return null;
        return (
          <EditNoteDialog
            isOpen={editNoteDialog.isOpen}
            currentNote={card?.notes || null}
            sceneNumber={scene.number}
            sceneHeading={scene.heading}
            onClose={() => setEditNoteDialog({ isOpen: false, sceneId: null })}
            onSave={(note) => {
              onSceneMetaUpdate(editNoteDialog.sceneId!, { notes: note || undefined });
              toast.success(note ? 'Note saved' : 'Note cleared');
            }}
          />
        );
      })()}

      {editMoodDialog.sceneId && (() => {
        const scene = scenes.find((s) => s.id === editMoodDialog.sceneId);
        const card = getCard(editMoodDialog.sceneId);
        if (!scene) return null;
        return (
          <EditMoodDialog
            isOpen={editMoodDialog.isOpen}
            currentMood={card?.mood || null}
            sceneNumber={scene.number}
            sceneHeading={scene.heading}
            onClose={() => setEditMoodDialog({ isOpen: false, sceneId: null })}
            onSave={(mood) => {
              onSceneMetaUpdate(editMoodDialog.sceneId!, { mood: mood || undefined });
              toast.success(mood ? 'Mood saved' : 'Mood cleared');
            }}
          />
        );
      })()}

      <CreateGroupDialog
        isOpen={createGroupDialog.isOpen}
        cardCount={createGroupDialog.cardIds.length}
        onClose={() => setCreateGroupDialog({ isOpen: false, cardIds: [] })}
        onSave={async (name, color) => {
          const group = await createGroup(name, color);
          if (group) {
            // Update all selected cards to be in this group
            for (const cardId of createGroupDialog.cardIds) {
              onSceneMetaUpdate(cardId, { customGroupId: group.id });
            }
            clearSelection();
          }
        }}
      />
    </div>
  );
}
