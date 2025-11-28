'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import {
  Film,
  Users,
  Layers,
  MapPin,
  Layout,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
} from 'lucide-react';
import { GraphFilterState, GraphLayoutType } from '@/types/graph';

interface StoryGraphToolbarProps {
  filters: GraphFilterState;
  onFiltersChange: (filters: GraphFilterState) => void;
  layout: GraphLayoutType;
  onLayoutChange: (layout: GraphLayoutType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onExport?: () => void;
}

export function StoryGraphToolbar({
  filters,
  onFiltersChange,
  layout,
  onLayoutChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onExport,
}: StoryGraphToolbarProps) {
  const toggleFilter = (key: keyof GraphFilterState) => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div
      className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2 pointer-events-none"
      role="toolbar"
      aria-label="Story graph controls"
    >
      {/* Filters */}
      <div
        className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border rounded-lg p-1 shadow-sm pointer-events-auto"
        role="group"
        aria-label="Filter node types"
      >
        <Toggle
          size="sm"
          pressed={filters.showScenes}
          onPressedChange={() => toggleFilter('showScenes')}
          aria-label={`${filters.showScenes ? 'Hide' : 'Show'} scenes`}
          title="Toggle scenes visibility"
        >
          <Film className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Scenes</span>
        </Toggle>
        <Toggle
          size="sm"
          pressed={filters.showCharacters}
          onPressedChange={() => toggleFilter('showCharacters')}
          aria-label={`${filters.showCharacters ? 'Hide' : 'Show'} characters`}
          title="Toggle characters visibility"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Characters</span>
        </Toggle>
        <Toggle
          size="sm"
          pressed={filters.showBeats}
          onPressedChange={() => toggleFilter('showBeats')}
          aria-label={`${filters.showBeats ? 'Hide' : 'Show'} beats`}
          title="Toggle beats visibility"
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Beats</span>
        </Toggle>
        <Toggle
          size="sm"
          pressed={filters.showLocations}
          onPressedChange={() => toggleFilter('showLocations')}
          aria-label={`${filters.showLocations ? 'Hide' : 'Show'} locations`}
          title="Toggle locations visibility"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Locations</span>
        </Toggle>
      </div>

      {/* Layout & Zoom Controls */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-card/95 backdrop-blur-sm pointer-events-auto"
              aria-label="Select layout type"
            >
              <Layout className="h-4 w-4 mr-2" aria-hidden="true" />
              Layout
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onLayoutChange('hierarchical')}
              className={layout === 'hierarchical' ? 'bg-accent' : ''}
              aria-selected={layout === 'hierarchical'}
            >
              Hierarchical
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onLayoutChange('force')}
              className={layout === 'force' ? 'bg-accent' : ''}
              aria-selected={layout === 'force'}
            >
              Force-directed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onLayoutChange('timeline')}
              className={layout === 'timeline' ? 'bg-accent' : ''}
              aria-selected={layout === 'timeline'}
            >
              Timeline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border rounded-lg p-1 shadow-sm pointer-events-auto"
          role="group"
          aria-label="Zoom controls"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomOut}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomIn}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onFitView}
            aria-label="Fit view to content"
            title="Fit to view"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          {onExport && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onExport}
              aria-label="Export graph"
              title="Export"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
