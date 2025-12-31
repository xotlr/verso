'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  Sparkles,
  GitBranch,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TapestryNodeType } from '@/types/tapestry';
import { FilterPanel, type TapestryFilters } from './filter-panel';

interface TapestryToolbarProps {
  onAddNode: (type: TapestryNodeType) => void;
  onAddGroup: () => void;
  onStartConnect: () => void;
  onDeleteNode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResetLayout: () => void;
  onAutoCluster?: () => void;
  onBarycenterSort?: () => void;
  onToggleLines?: () => void;
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

export function TapestryToolbar({
  onAddNode,
  onAddGroup,
  onStartConnect,
  onDeleteNode,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetLayout,
  onAutoCluster,
  onBarycenterSort,
  onToggleLines,
  showAllLines,
  hasSelectedNode,
  isConnecting,
  filters,
  onFiltersChange,
  availableCharacters,
}: TapestryToolbarProps) {
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
      {/* Main actions */}
      <div className="flex items-center gap-1 bg-card/90 backdrop-blur border border-border/60 rounded-lg p-1 shadow-lg">
        {/* Add Node Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="Add Node"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
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

        <div className="w-px h-5 bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onStartConnect}
          disabled={!hasSelectedNode}
          title="Connect Nodes"
          className={cn(
            'h-8 w-8 p-0',
            isConnecting && 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          <Link2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteNode}
          disabled={!hasSelectedNode}
          title="Delete Node"
          className="h-8 w-8 p-0 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1 bg-card/90 backdrop-blur border border-border/60 rounded-lg p-1 shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          title="Zoom In"
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          title="Zoom Out"
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onFitView}
          title="Fit View"
          className="h-8 w-8 p-0"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        {onAutoCluster && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAutoCluster}
            title="Auto-cluster by connections"
            className="h-8 w-8 p-0"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}

        {onBarycenterSort && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBarycenterSort}
            title="Barycenter sort (untangle lines)"
            className="h-8 w-8 p-0"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onResetLayout}
          title="Reset Layout"
          className="h-8 w-8 p-0 hover:text-destructive"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Line visibility toggle */}
      {onToggleLines && (
        <div className="flex items-center gap-1 bg-card/90 backdrop-blur border border-border/60 rounded-lg p-1 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLines}
            title={showAllLines ? "Hide connection lines" : "Show all connection lines"}
            className={cn(
              "h-8 px-2 gap-1.5 text-xs",
              showAllLines && "bg-primary/10 text-primary"
            )}
          >
            {showAllLines ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>{showAllLines ? "Lines On" : "Lines Off"}</span>
          </Button>
        </div>
      )}

      {/* Filter controls */}
      <div className="bg-card/90 backdrop-blur border border-border/60 rounded-lg p-1 shadow-lg">
        <FilterPanel
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableCharacters={availableCharacters}
        />
      </div>
    </div>
  );
}
