import { Scene } from '@/types/screenplay';

// ============================================================================
// INDEX CARD TYPES
// ============================================================================

/**
 * Status types for index cards
 */
export const CARD_STATUSES = ['draft', 'outline', 'writing', 'revision', 'complete'] as const;
export type CardStatus = typeof CARD_STATUSES[number];

/**
 * Index card representing a single scene
 */
export interface IndexCard {
  sceneId: string;
  color: string | null;
  status: CardStatus;
  summary: string;
  notes?: string;
  mood?: string | null;
  act?: string | null;
  customGroupId?: string | null;
}

// ============================================================================
// CARD GROUP TYPES
// ============================================================================

/**
 * Type of card group
 * - act: Synced from beat board, read-only
 * - custom: User-created, fully editable
 */
export type CardGroupType = 'act' | 'custom';

/**
 * Color options for custom groups
 */
export const GROUP_COLORS = [
  'slate',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

export type GroupColor = typeof GROUP_COLORS[number];

/**
 * Card group (either act-based or custom)
 */
export interface CardGroup {
  id: string;
  name: string;
  type: CardGroupType;
  color?: GroupColor;
  order: number;
  isCollapsed?: boolean;
}

/**
 * Custom card group stored in database
 */
export interface CustomCardGroup {
  id: string;
  screenplayId: string;
  name: string;
  color: GroupColor;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cards organized by groups
 */
export interface GroupedCards {
  groups: Array<{
    group: CardGroup;
    cards: IndexCard[];
  }>;
  ungrouped: IndexCard[];
}

// ============================================================================
// CONTEXT MENU TYPES
// ============================================================================

/**
 * Context menu action type
 */
export type CardContextAction =
  | 'change-status'
  | 'jump-to-scene'
  | 'edit-heading'
  | 'add-to-group'
  | 'remove-from-group'
  | 'assign-to-act'
  | 'set-color'
  | 'add-note'
  | 'set-mood'
  | 'delete-scene';

export type GroupContextAction =
  | 'rename-group'
  | 'change-color'
  | 'ungroup-all'
  | 'delete-group';

/**
 * Context menu state
 */
export interface CardContextMenuState {
  x: number;
  y: number;
  cardId: string | null;
  groupId: string | null;
}

// ============================================================================
// SELECTION TYPES
// ============================================================================

/**
 * Multi-select state for cards
 */
export interface CardSelectionState {
  selectedCardIds: Set<string>;
  isSelectionMode: boolean;
}

// ============================================================================
// DRAG AND DROP TYPES
// ============================================================================

/**
 * Draggable item types
 */
export type DraggableType = 'card' | 'group';

/**
 * Drag data for index cards
 */
export interface CardDragData {
  type: 'card';
  cardId: string;
  sceneId: string;
  currentGroupId?: string;
}

/**
 * Drop target data
 */
export interface DropTargetData {
  type: 'card' | 'group' | 'group-header';
  id: string;
  groupId?: string;
}

// ============================================================================
// PROPS INTERFACES
// ============================================================================

export interface IndexCardsProps {
  scenes: Scene[];
  cards: IndexCard[];
  customGroups: CustomCardGroup[];
  acts: Array<{ id: string; label: string }>;
  characterRankings?: Map<string, number>;
  onCardsChange: (cards: IndexCard[]) => void;
  onScenesReorder: (scenes: Scene[]) => void;
  onSceneClick?: (sceneId: string) => void;
  onCustomGroupsChange: (groups: CustomCardGroup[]) => void;
}

export interface GroupSectionProps {
  group: CardGroup;
  cards: IndexCard[];
  scenes: Scene[];
  characterRankings?: Map<string, number>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCardClick: (cardId: string) => void;
  onCardStatusChange: (cardId: string, status: CardStatus) => void;
  onContextMenu: (e: React.MouseEvent, cardId: string, groupId?: string) => void;
  onGroupAction: (action: GroupContextAction, groupId: string) => void;
  selectedCardIds: Set<string>;
  onCardSelect: (cardId: string, isMulti: boolean) => void;
}

export interface GroupHeaderProps {
  group: CardGroup;
  cardCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRename: (newName: string) => void;
  onChangeColor: (color: GroupColor) => void;
  onUngroup: () => void;
  onDelete?: () => void;
}

export interface CardContextMenuProps {
  state: CardContextMenuState;
  card: IndexCard | null;
  groups: CardGroup[];
  acts: Array<{ id: string; label: string }>;
  onClose: () => void;
  onAction: (action: CardContextAction, data?: unknown) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Card with enriched scene data
 */
export interface EnrichedCard extends IndexCard {
  scene: Scene;
  characters: string[];
}

/**
 * Filter state for index cards
 */
export interface CardFilterState {
  timeOfDay: string | null;
  status: CardStatus | null;
  act: string | null;
  customGroup: string | null;
  searchQuery: string;
}

/**
 * Sort options for cards
 */
export type CardSortOption = 'scene-order' | 'status' | 'time-of-day' | 'custom';
