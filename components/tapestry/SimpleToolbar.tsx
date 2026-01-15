'use client';

/**
 * Simple toolbar for tapestry canvas controls.
 */

interface SimpleToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitToContent: () => void;
  onAutoCluster: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function SimpleToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToContent,
  onAutoCluster,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: SimpleToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-sm">
      <button
        className="p-2 hover:bg-accent rounded disabled:opacity-50"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        className="p-2 hover:bg-accent rounded disabled:opacity-50"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷
      </button>
      <div className="w-px bg-border mx-1" />
      <button
        className="p-2 hover:bg-accent rounded"
        onClick={onZoomIn}
        title="Zoom In"
      >
        +
      </button>
      <button
        className="p-2 hover:bg-accent rounded"
        onClick={onZoomOut}
        title="Zoom Out"
      >
        −
      </button>
      <button
        className="p-2 hover:bg-accent rounded text-xs"
        onClick={onResetView}
        title="Reset View"
      >
        1:1
      </button>
      <button
        className="p-2 hover:bg-accent rounded text-xs"
        onClick={onFitToContent}
        title="Fit to Content"
      >
        Fit
      </button>
      <div className="w-px bg-border mx-1" />
      <button
        className="p-2 hover:bg-accent rounded text-xs"
        onClick={onAutoCluster}
        title="Auto Layout"
      >
        Auto
      </button>
    </div>
  );
}
