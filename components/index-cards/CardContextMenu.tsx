'use client';

import React, { useEffect, useRef } from 'react';
import {
  Check,
  Edit3,
  ExternalLink,
  FolderPlus,
  Layers,
  Palette,
  StickyNote,
  Smile,
  Trash2,
  X,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IndexCard, CardGroup, CardStatus, GroupColor } from '@/types/index-cards';
import type { ActConfig } from '@/types/beat-board';

interface CardContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  card: IndexCard | null;
  groups: CardGroup[];
  acts: ActConfig[];
  onClose: () => void;
  onChangeStatus: (status: CardStatus) => void;
  onJumpToScene: () => void;
  onEditHeading: () => void;
  onAddToGroup: (groupId: string) => void;
  onRemoveFromGroup: () => void;
  onAssignToAct: (actId: string | null) => void;
  onSetColor: (color: string | null) => void;
  onAddNote: () => void;
  onSetMood: () => void;
  onDeleteScene: () => void;
}

const STATUS_OPTIONS: Array<{ value: CardStatus; label: string; color: string }> = [
  { value: 'draft', label: 'Draft', color: 'bg-zinc-500' },
  { value: 'outline', label: 'Outline', color: 'bg-blue-500' },
  { value: 'writing', label: 'Writing', color: 'bg-amber-500' },
  { value: 'revision', label: 'Revision', color: 'bg-orange-500' },
  { value: 'complete', label: 'Complete', color: 'bg-emerald-500' },
];

const COLOR_OPTIONS = [
  { value: null, label: 'None', class: 'bg-muted border-2 border-dashed border-muted-foreground/30' },
  { value: '#EF4444', label: 'Red', class: 'bg-red-500' },
  { value: '#F97316', label: 'Orange', class: 'bg-orange-500' },
  { value: '#F59E0B', label: 'Amber', class: 'bg-amber-500' },
  { value: '#10B981', label: 'Green', class: 'bg-emerald-500' },
  { value: '#3B82F6', label: 'Blue', class: 'bg-blue-500' },
  { value: '#8B5CF6', label: 'Purple', class: 'bg-violet-500' },
  { value: '#EC4899', label: 'Pink', class: 'bg-pink-500' },
];

export function CardContextMenu({
  isOpen,
  x,
  y,
  card,
  groups,
  acts,
  onClose,
  onChangeStatus,
  onJumpToScene,
  onEditHeading,
  onAddToGroup,
  onRemoveFromGroup,
  onAssignToAct,
  onSetColor,
  onAddNote,
  onSetMood,
  onDeleteScene,
}: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay in viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [isOpen, x, y]);

  if (!isOpen || !card) return null;

  const customGroups = groups.filter((g) => g.type === 'custom');
  const isInCustomGroup = card.customGroupId !== null && card.customGroupId !== undefined;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-56 rounded-2xl border bg-popover/95 backdrop-blur-xl shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      {/* Status */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('status')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <div className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-t-2xl cursor-pointer">
          <CircleDot className="mr-2 h-4 w-4" />
          Change Status
          <span className="ml-auto text-xs text-muted-foreground">›</span>
        </div>

        {activeSubmenu === 'status' && (
          <div className="absolute left-full top-0 ml-1 min-w-40 rounded-xl border bg-popover/95 backdrop-blur-xl shadow-lg">
            {STATUS_OPTIONS.map((status) => (
              <div
                key={status.value}
                onClick={() => handleAction(() => onChangeStatus(status.value))}
                className="menu-item first:rounded-t-xl last:rounded-b-xl"
              >
                <div className={cn('w-2 h-2 rounded-full mr-2', status.color)} />
                {status.label}
                {card.status === status.value && <Check className="ml-auto h-4 w-4" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Jump to Scene */}
      <div
        onClick={() => handleAction(onJumpToScene)}
        className="menu-item"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Jump to Scene
      </div>

      {/* Edit Heading */}
      <div
        onClick={() => handleAction(onEditHeading)}
        className="menu-item"
      >
        <Edit3 className="mr-2 h-4 w-4" />
        Edit Scene Heading
      </div>

      <div className="h-px bg-border" />

      {/* Add to Group */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('group')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <div className="menu-item">
          <FolderPlus className="mr-2 h-4 w-4" />
          Add to Group
          <span className="ml-auto text-xs text-muted-foreground">›</span>
        </div>

        {activeSubmenu === 'group' && (
          <div className="absolute left-full top-0 ml-1 min-w-48 max-h-64 overflow-y-auto rounded-xl border bg-popover/95 backdrop-blur-xl shadow-lg">
            {customGroups.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No groups yet</div>
            ) : (
              customGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => handleAction(() => onAddToGroup(group.id))}
                  className="menu-item first:rounded-t-xl last:rounded-b-xl"
                >
                  <div
                    className={cn('w-2 h-2 rounded-full mr-2', `bg-${group.color}-500`)}
                  />
                  {group.name}
                  {card.customGroupId === group.id && <Check className="ml-auto h-4 w-4" />}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Remove from Group */}
      {isInCustomGroup && (
        <div
          onClick={() => handleAction(onRemoveFromGroup)}
          className="menu-item"
        >
          <X className="mr-2 h-4 w-4" />
          Remove from Group
        </div>
      )}

      {/* Assign to Act */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('act')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <div className="menu-item">
          <Layers className="mr-2 h-4 w-4" />
          Assign to Act
          <span className="ml-auto text-xs text-muted-foreground">›</span>
        </div>

        {activeSubmenu === 'act' && (
          <div className="absolute left-full top-0 ml-1 min-w-40 rounded-xl border bg-popover/95 backdrop-blur-xl shadow-lg">
            <div
              onClick={() => handleAction(() => onAssignToAct(null))}
              className="menu-item rounded-t-xl"
            >
              <X className="mr-2 h-4 w-4" />
              None
              {!card.act && <Check className="ml-auto h-4 w-4" />}
            </div>
            {acts.map((act) => (
              <div
                key={act.id}
                onClick={() => handleAction(() => onAssignToAct(act.id))}
                className="menu-item last:rounded-b-xl"
              >
                {act.label}
                {card.act === act.id && <Check className="ml-auto h-4 w-4" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Set Color */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('color')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <div className="menu-item">
          <Palette className="mr-2 h-4 w-4" />
          Set Card Color
          <span className="ml-auto text-xs text-muted-foreground">›</span>
        </div>

        {activeSubmenu === 'color' && (
          <div className="absolute left-full top-0 ml-1 w-40 rounded-xl border bg-popover/95 backdrop-blur-xl shadow-lg p-2">
            <div className="grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption.value ?? 'none'}
                  onClick={() => handleAction(() => onSetColor(colorOption.value))}
                  className={cn(
                    'w-8 h-8 rounded-md border-2 transition-all',
                    colorOption.class,
                    card.color === colorOption.value
                      ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20'
                      : 'border-transparent hover:border-foreground/30'
                  )}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Note */}
      <div
        onClick={() => handleAction(onAddNote)}
        className="menu-item"
      >
        <StickyNote className="mr-2 h-4 w-4" />
        {card.notes ? 'Edit Note' : 'Add Note'}
      </div>

      {/* Set Mood */}
      <div
        onClick={() => handleAction(onSetMood)}
        className="menu-item"
      >
        <Smile className="mr-2 h-4 w-4" />
        {card.mood ? 'Edit Mood' : 'Set Mood'}
      </div>

      <div className="h-px bg-border" />

      {/* Delete Scene */}
      <div
        onClick={() => handleAction(onDeleteScene)}
        className="flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer rounded-b-2xl"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Scene
      </div>
    </div>
  );
}
