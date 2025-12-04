/**
 * Real-time collaboration types
 * Works with both ProseMirror and Classic editors
 */

export type EditorType = 'prosemirror' | 'classic';

export type OperationType =
  | 'insert'
  | 'delete'
  | 'replace'
  | 'cursor_move'
  | 'selection_change';

export interface CollaborationOperation {
  id: string;
  screenplayId: string;
  userId: string;
  operationType: OperationType;
  position: number | null;
  content: string | null;
  metadata?: Record<string, any>;
  timestamp: Date;
  sequenceNumber: number;
}

export interface RemoteUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  editorType: EditorType;
  cursorPosition: number;
  color: string;
  lastSeen: Date;
}

export interface CollaborationSession {
  id: string;
  screenplayId: string;
  userId: string;
  editorType: EditorType;
  cursorPosition: number;
  lastSeen: Date;
  metadata?: {
    userName?: string;
    userEmail?: string;
    userImage?: string | null;
    color?: string;
  };
}

export interface CollaborationConflict {
  id: string;
  screenplayId: string;
  operationId: string;
  conflictingOperationId: string;
  resolved: boolean;
  resolutionStrategy?: 'manual' | 'auto_merge' | 'last_write_wins';
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface BroadcastChangePayload {
  type: OperationType;
  position?: number;
  content?: string;
  cursorPosition?: number;
  metadata?: Record<string, any>;
}

export interface PresencePayload {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  editorType: EditorType;
  cursorPosition: number;
  color: string;
}

export interface CollaborationState {
  isConnected: boolean;
  remoteUsers: RemoteUser[];
  activeUsers: number;
  lastSync: Date | null;
  conflicts: CollaborationConflict[];
}

// User color palette for collaborative cursors
export const COLLABORATION_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Orange
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Light Blue
  '#F8B739', // Gold
  '#52C41A', // Green
] as const;

export type CollaborationColor = typeof COLLABORATION_COLORS[number];

/**
 * Get a consistent color for a user based on their ID
 */
export function getUserColor(userId: string): CollaborationColor {
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const index = Math.abs(hash) % COLLABORATION_COLORS.length;
  return COLLABORATION_COLORS[index];
}
