/**
 * Classic Editor Collaboration Integration
 *
 * Handles real-time collaboration for the Classic (block-based) editor
 */

import type { ScriptBlock } from './types';
import { BlockType } from './types';
import type { CollaborationOperation } from '@/types/collaboration';

/**
 * Convert blocks array to plain text for synchronization
 */
export function blocksToText(blocks: ScriptBlock[]): string {
  return blocks
    .map((block) => block.content)
    .join('\n');
}

/**
 * Convert plain text back to blocks array
 * This is a simple implementation that preserves block structure
 */
export function textToBlocks(text: string, existingBlocks: ScriptBlock[]): ScriptBlock[] {
  const lines = text.split('\n');
  const newBlocks: ScriptBlock[] = [];

  // Try to preserve existing block IDs and types when possible
  lines.forEach((line, index) => {
    const existingBlock = existingBlocks[index];

    if (existingBlock) {
      // Preserve existing block structure, just update content
      newBlocks.push({
        ...existingBlock,
        content: line,
      });
    } else {
      // Create new block with default type
      newBlocks.push({
        id: `block-${Date.now()}-${index}`,
        type: BlockType.ACTION, // Default to ACTION
        content: line,
      });
    }
  });

  return newBlocks;
}

/**
 * Apply a remote change to the blocks array
 */
export function applyRemoteChangeToBlocks(
  currentBlocks: ScriptBlock[],
  operation: CollaborationOperation
): ScriptBlock[] {
  if (operation.operationType !== 'replace' || !operation.content) {
    return currentBlocks;
  }

  // Convert remote text to blocks, preserving structure
  return textToBlocks(operation.content, currentBlocks);
}

/**
 * Calculate cursor position in blocks array
 */
export function getCursorPositionInBlocks(
  blocks: ScriptBlock[],
  activeBlockId: string | null,
  cursorOffsetInBlock: number = 0
): number {
  if (!activeBlockId) return 0;

  let position = 0;
  for (const block of blocks) {
    if (block.id === activeBlockId) {
      return position + cursorOffsetInBlock;
    }
    position += block.content.length + 1; // +1 for newline
  }

  return position;
}

/**
 * Find block and cursor offset from absolute text position
 */
export function getBlockFromPosition(
  blocks: ScriptBlock[],
  position: number
): { blockId: string; offset: number } | null {
  let currentPosition = 0;

  for (const block of blocks) {
    const blockLength = block.content.length + 1; // +1 for newline

    if (position >= currentPosition && position < currentPosition + blockLength) {
      return {
        blockId: block.id,
        offset: position - currentPosition,
      };
    }

    currentPosition += blockLength;
  }

  // If position is beyond all blocks, return last block
  if (blocks.length > 0) {
    const lastBlock = blocks[blocks.length - 1];
    return {
      blockId: lastBlock.id,
      offset: lastBlock.content.length,
    };
  }

  return null;
}

/**
 * Detect if blocks have meaningful changes (not just whitespace)
 */
export function hasSignificantChanges(
  oldBlocks: ScriptBlock[],
  newBlocks: ScriptBlock[]
): boolean {
  if (oldBlocks.length !== newBlocks.length) return true;

  for (let i = 0; i < oldBlocks.length; i++) {
    const oldContent = oldBlocks[i].content.trim();
    const newContent = newBlocks[i].content.trim();

    if (oldContent !== newContent) return true;
    if (oldBlocks[i].type !== newBlocks[i].type) return true;
  }

  return false;
}

/**
 * Merge remote changes with local changes using simple conflict resolution
 * Strategy: Last write wins, but preserve local cursor position
 */
export function mergeBlocks(
  localBlocks: ScriptBlock[],
  remoteBlocks: ScriptBlock[],
  localTimestamp: number,
  remoteTimestamp: number
): ScriptBlock[] {
  // If remote is newer, use remote blocks
  if (remoteTimestamp > localTimestamp) {
    return remoteBlocks;
  }

  // Otherwise keep local blocks
  return localBlocks;
}
