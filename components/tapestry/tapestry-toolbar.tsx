'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Link2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SquareDashed,
  StickyNote,
  User,
  MapPin,
  Package,
  Film,
  RotateCcw,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TapestryNodeType } from '@/types/tapestry';
import { FilterPanel, type TapestryFilters } from './filter-panel';
import { toolbarStyles, getToolbarButtonClasses, getToolbarContainerClasses } from '@/components/editor/toolbar-styles';

interface TapestryToolbarProps {
  onAddNode: (type: TapestryNodeType) => void;
  onAddGroup: () => void;
  onStartConnect: () => void;
  onDeleteNode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetLayout: () => void;
  onToggleLines?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  showAllLines?: boolean;
  hasSelectedNode: boolean;
  isConnecting: boolean;
  filters: TapestryFilters;
  onFiltersChange: (filters: TapestryFilters) => void;
  availableCharacters: string[];
}

const NODE_TYPE_OPTIONS: Array<{ type: TapestryNodeType; label: string; icon: typeof StickyNote }> = [
  { type: 'note', label: 'Note', icon: StickyNote },
  { type: 'scene', label: 'Scene', icon: Film },
  { type: 'character', label: 'Character', icon: User },
  { type: 'location', label: 'Location', icon: MapPin },
  { type: 'item', label: 'Item', icon: Package },
];

// Procreate-style icon button using shared toolbar styles
function IconButton({
  icon: Icon,
  onClick,
  disabled,
  active,
  destructive,
  title,
}: {
  icon: typeof Plus;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            getToolbarButtonClasses(active ?? false, disabled ?? false),
            destructive && !disabled && 'hover:text-destructive'
          )}
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export function TapestryToolbar({
  onAddNode,
  onAddGroup,
  onStartConnect,
  onDeleteNode,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetLayout,
  onToggleLines,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  showAllLines,
  hasSelectedNode,
  isConnecting,
  filters,
  onFiltersChange,
  availableCharacters,
}: TapestryToolbarProps) {
  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex items-center gap-2 pointer-events-none">
      {/* Left cluster - Edit actions */}
      <div className={cn(getToolbarContainerClasses('horizontal'), 'pointer-events-auto')}>
        {/* Undo/Redo */}
        {onUndo && (
          <>
            <IconButton icon={Undo2} onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)" />
            <IconButton icon={Redo2} onClick={onRedo} disabled={!canRedo} title="Redo (⌘⇧Z)" />
            <div className={toolbarStyles.divider.horizontal} />
          </>
        )}

        {/* Add Node Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className={getToolbarButtonClasses(false, false)}>
                  <Plus className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Add Node</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-36 rounded-2xl">
            {NODE_TYPE_OPTIONS.map(({ type, label, icon: Icon }) => (
              <DropdownMenuItem key={type} onClick={() => onAddNode(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAddGroup}>
              <SquareDashed className="h-4 w-4 mr-2" />
              Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <IconButton
          icon={Link2}
          onClick={onStartConnect}
          disabled={!hasSelectedNode}
          active={isConnecting}
          title="Connect Nodes"
        />

        <IconButton
          icon={Trash2}
          onClick={onDeleteNode}
          disabled={!hasSelectedNode}
          destructive
          title="Delete Node"
        />
      </div>

      {/* Center cluster - View controls */}
      <div className={cn(getToolbarContainerClasses('horizontal'), 'pointer-events-auto')}>
        <IconButton icon={ZoomOut} onClick={onZoomOut} title="Zoom Out" />
        <IconButton icon={ZoomIn} onClick={onZoomIn} title="Zoom In" />
        <IconButton icon={Maximize2} onClick={onFitView} title="Fit View" />

        <div className={toolbarStyles.divider.horizontal} />

        {onToggleLines && (
          <IconButton
            icon={showAllLines ? Eye : EyeOff}
            onClick={onToggleLines}
            active={showAllLines}
            title={showAllLines ? "Hide Lines" : "Show Lines"}
          />
        )}

        <IconButton
          icon={RotateCcw}
          onClick={onResetLayout}
          destructive
          title="Reset Layout"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right cluster - Search & Filter */}
      <div className={cn(getToolbarContainerClasses('horizontal'), 'pointer-events-auto p-1')}>
        <FilterPanel
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableCharacters={availableCharacters}
        />
      </div>
    </div>
  );
}
